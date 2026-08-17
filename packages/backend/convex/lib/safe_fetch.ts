"use node";

/**
 * safe-fetch — shared SSRF guard for server-side fetches of user-supplied URLs.
 *
 * The bookmark processing pipeline fetches arbitrary URLs provided by users
 * (page HTML, images, PDFs, thumbnails). Without validation an attacker can
 * point a bookmark at an internal address (127.0.0.1, 169.254.169.254 cloud
 * metadata, RFC1918 ranges, ...) and use our server as an SSRF proxy.
 *
 * `assertSafeRemoteUrl` validates the protocol + hostname and resolves DNS,
 * rejecting the URL if ANY resolved address is private/link-local/reserved.
 * `safeFetch` pins each connection to an address from that validation while
 * preserving the original hostname for HTTP Host and TLS SNI. Redirects are
 * followed manually and independently validated/pinned.
 *
 * Node runtime only — `node:dns`/`node:net` require `"use node";`.
 *
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import {
  Agent,
  fetch as undiciFetch,
  type RequestInit as UndiciRequestInit,
} from "undici";
import { assertSafeHttpUrl } from "../utils/url";

const DEFAULT_MAX_REDIRECTS = 5;

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

export function isPrivateIpv4Address(address: string): boolean {
  try {
    const parsed = ipaddr.parse(address);
    // ipaddr.js maintains the canonical special-purpose registry. Permit only
    // ordinary global IPv4 unicast and fail closed for every special range.
    return parsed.kind() !== "ipv4" || parsed.range() !== "unicast";
  } catch {
    return true;
  }
}

export function isPrivateIpv6Address(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");

  try {
    const parsed = ipaddr.parse(normalized);
    // Fail closed for every IANA special-use IPv6 range. This includes IPv4
    // mapped/translated addresses and transition mechanisms such as NAT64,
    // 6to4, and Teredo, so embedded private IPv4 cannot bypass classification.
    return parsed.kind() !== "ipv6" || parsed.range() !== "unicast";
  } catch {
    return true;
  }
}

export function isPrivateIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4Address(address);
  if (family === 6) return isPrivateIpv6Address(address);
  // Not an IP literal — cannot classify here; caller resolves DNS instead.
  return true;
}

/**
 * Validates protocol + hostname and resolves DNS, throwing if the host is
 * missing, unresolvable, or maps to any private/reserved address. Returns the
 * normalized URL string on success.
 */
type ResolvedAddress = { address: string; family: number };
type SafeRemoteTarget = { url: string; addresses: ResolvedAddress[] };

function abortReason(signal: AbortSignal): unknown {
  return (
    signal.reason ?? new DOMException("The operation was aborted", "AbortError")
  );
}

async function lookupWithSignal(
  hostname: string,
  signal?: AbortSignal | null,
): Promise<ResolvedAddress[]> {
  if (signal?.aborted) throw abortReason(signal);

  const pendingLookup = lookup(hostname, { all: true, verbatim: true });
  if (!signal) return pendingLookup;

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    pendingLookup.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

async function resolveSafeRemoteUrl(
  url: string,
  signal?: AbortSignal | null,
): Promise<SafeRemoteTarget> {
  const normalizedUrl = assertSafeHttpUrl(url);
  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isPrivateIpAddress(hostname)) {
      throw new Error("This URL resolves to a private address");
    }
    return {
      url: normalizedUrl,
      addresses: [{ address: hostname, family: literalFamily }],
    };
  }

  const addresses = await lookupWithSignal(hostname, signal);
  if (addresses.length === 0) {
    throw new Error("This URL host could not be resolved");
  }
  if (addresses.some(({ address }) => isPrivateIpAddress(address))) {
    throw new Error("This URL resolves to a private address");
  }

  return { url: normalizedUrl, addresses };
}

export async function assertSafeRemoteUrl(
  url: string,
  signal?: AbortSignal | null,
): Promise<string> {
  return (await resolveSafeRemoteUrl(url, signal)).url;
}

export type SafeFetchInit = RequestInit & { maxRedirects?: number };

/**
 * `fetch` with SSRF protection. Validates the initial URL and every redirect
 * target before connecting. Redirects are followed manually (`redirect:
 * "manual"`) so the guard runs on each hop; a public URL cannot bounce to an
 * internal host.
 */
export async function safeFetch(
  url: string,
  init: SafeFetchInit = {},
): Promise<Response> {
  const { maxRedirects = DEFAULT_MAX_REDIRECTS, ...fetchInit } = init;

  let currentTarget = await resolveSafeRemoteUrl(url, fetchInit.signal);
  const visited = new Set<string>();

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const currentUrl = currentTarget.url;
    if (visited.has(currentUrl)) {
      throw new Error("Redirect loop detected");
    }
    visited.add(currentUrl);

    const dispatcher = new Agent({
      connect: {
        lookup: (_hostname, options, callback) => {
          const requestedFamily =
            typeof options === "number" ? options : options.family;
          const matchingAddresses = currentTarget.addresses.filter(
            ({ family }) => !requestedFamily || family === requestedFamily,
          );

          if (typeof options !== "number" && options.all) {
            if (matchingAddresses.length === 0) {
              callback(new Error("Validated host has no usable address"), []);
              return;
            }
            callback(null, matchingAddresses);
            return;
          }

          const selected = matchingAddresses[0] ?? currentTarget.addresses[0];
          if (!selected) {
            callback(new Error("Validated host has no usable address"), "", 0);
            return;
          }
          callback(null, selected.address, selected.family);
        },
      },
    });
    let response: Response;
    try {
      const requestInit = {
        ...fetchInit,
        dispatcher,
        redirect: "manual",
      } as unknown as UndiciRequestInit;
      response = (await undiciFetch(
        currentUrl,
        requestInit,
      )) as unknown as Response;
      void dispatcher.close().catch(() => undefined);
    } catch (error) {
      await dispatcher.destroy();
      throw error;
    }

    if (!REDIRECT_STATUS.has(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) {
      // A redirect status without a Location — nothing more to follow.
      return response;
    }

    currentTarget = await resolveSafeRemoteUrl(
      new URL(location, currentUrl).toString(),
      fetchInit.signal,
    );
  }

  throw new Error("Too many redirects");
}
