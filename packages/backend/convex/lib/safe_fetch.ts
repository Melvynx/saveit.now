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
 * `safeFetch` wraps `fetch`, re-validating every redirect hop (redirects are
 * followed manually so a public URL cannot 30x-redirect to an internal host).
 *
 * Node runtime only — `node:dns`/`node:net` require `"use node";`.
 *
 * Residual risk: DNS rebinding (the kernel re-resolves the hostname when
 * `fetch` opens the socket, so a fast-flipping record can still differ from
 * the validated address). Matching the codebase's existing bar; full closure
 * would require pinning the connection to the validated IP.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { assertSafeHttpUrl } from "../utils/url";

const DEFAULT_MAX_REDIRECTS = 5;

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

export function isPrivateIpv4Address(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    // Not a well-formed IPv4 literal — treat as unsafe rather than allow.
    return true;
  }

  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 || // 0.0.0.0/8 "this host"
    a === 10 || // 10.0.0.0/8 private
    a === 127 || // 127.0.0.0/8 loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local (incl. cloud metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 0) || // 192.0.0.0/24 + 192.0.2.0/24 reserved/TEST-NET-1
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 198 && (b === 18 || b === 19 || b === 51)) || // benchmarking + TEST-NET-2
    (a === 203 && b === 0) || // 203.0.113.0/24 TEST-NET-3
    a >= 224 // multicast + reserved
  );
}

export function isPrivateIpv6Address(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");

  return (
    normalized === "::" ||
    normalized === "::1" || // loopback
    normalized.startsWith("fc") || // fc00::/7 unique local
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") || // fe80::/10 link-local
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("2001:db8") || // documentation range
    (normalized.startsWith("::ffff:") &&
      isPrivateIpv4Address(normalized.slice("::ffff:".length)))
  );
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
export async function assertSafeRemoteUrl(url: string): Promise<string> {
  const normalizedUrl = assertSafeHttpUrl(url);
  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  if (isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      throw new Error("This URL resolves to a private address");
    }
    return normalizedUrl;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) {
    throw new Error("This URL host could not be resolved");
  }
  if (addresses.some(({ address }) => isPrivateIpAddress(address))) {
    throw new Error("This URL resolves to a private address");
  }

  return normalizedUrl;
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

  let currentUrl = await assertSafeRemoteUrl(url);
  const visited = new Set<string>();

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    if (visited.has(currentUrl)) {
      throw new Error("Redirect loop detected");
    }
    visited.add(currentUrl);

    const response = await fetch(currentUrl, {
      ...fetchInit,
      redirect: "manual",
    });

    if (!REDIRECT_STATUS.has(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) {
      // A redirect status without a Location — nothing more to follow.
      return response;
    }

    currentUrl = await assertSafeRemoteUrl(
      new URL(location, currentUrl).toString(),
    );
  }

  throw new Error("Too many redirects");
}
