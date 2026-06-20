import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTNAMES = new Set(["localhost"]);
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 5;
const BLOCKED_IPV4_CIDRS: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];
const BLOCKED_IPV6_CIDRS: Array<[string, number]> = [
  ["::", 128],
  ["::1", 128],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

export class UnsafeToolUrlError extends Error {
  constructor(message = "URL is not allowed") {
    super(message);
    this.name = "UnsafeToolUrlError";
  }
}

export type SafeToolFetchInit = RequestInit & {
  maxRedirects?: number;
  maxResponseBytes?: number;
  timeoutMs?: number;
};

function stripIpv6Brackets(hostname: string) {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

function normalizeHostname(hostname: string) {
  return stripIpv6Brackets(hostname).toLowerCase().replace(/\.+$/, "");
}

function ipv4ToInt(address: string) {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return null;
  }

  return (
    ((parts[0]! << 24) >>> 0) +
    (parts[1]! << 16) +
    (parts[2]! << 8) +
    parts[3]!
  ) >>> 0;
}

function isIpv4InCidr(address: string, base: string, bits: number) {
  const value = ipv4ToInt(address);
  const baseValue = ipv4ToInt(base);
  if (value === null || baseValue === null) return false;

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (baseValue & mask);
}

function parseEmbeddedIpv4(segment: string) {
  if (!segment.includes(".")) return null;
  const value = ipv4ToInt(segment);
  if (value === null) return null;
  return [
    ((value >>> 16) & 0xffff).toString(16),
    (value & 0xffff).toString(16),
  ];
}

function ipv6ToSegments(address: string) {
  const zoneIndex = address.indexOf("%");
  const normalized = (
    zoneIndex === -1 ? address : address.slice(0, zoneIndex)
  ).toLowerCase();
  const halves = normalized.split("::");
  if (halves.length > 2) return null;

  const parseSide = (side: string) => {
    if (!side) return [] as string[];
    const segments = side.split(":");
    const lastSegment = segments[segments.length - 1];
    if (lastSegment?.includes(".")) {
      const ipv4Segments = parseEmbeddedIpv4(lastSegment);
      if (!ipv4Segments) return null;
      return [...segments.slice(0, -1), ...ipv4Segments];
    }
    return segments;
  };

  const left = parseSide(halves[0]!);
  const right = parseSide(halves[1] ?? "");
  if (!left || !right) return null;

  const missing = halves.length === 2 ? 8 - left.length - right.length : 0;
  if (missing < 0) return null;

  const segments = halves.length === 2
    ? [...left, ...Array.from({ length: missing }, () => "0"), ...right]
    : left;
  if (segments.length !== 8) return null;

  const parsedSegments: number[] = [];
  for (const segment of segments) {
    if (!/^[0-9a-f]{1,4}$/.test(segment)) return null;
    parsedSegments.push(Number.parseInt(segment, 16));
  }

  return parsedSegments;
}

function isIpv6InCidr(address: string, base: string, bits: number) {
  const value = ipv6ToSegments(address);
  const baseValue = ipv6ToSegments(base);
  if (!value || !baseValue) return false;

  const fullSegments = Math.floor(bits / 16);
  const remainingBits = bits % 16;

  for (let index = 0; index < fullSegments; index += 1) {
    if (value[index] !== baseValue[index]) return false;
  }

  if (remainingBits === 0) return true;

  const mask = (0xffff << (16 - remainingBits)) & 0xffff;
  return (value[fullSegments]! & mask) === (baseValue[fullSegments]! & mask);
}

function ipv4FromMappedIpv6(address: string) {
  const value = ipv6ToSegments(address);
  if (!value) return null;
  if (
    value[0] !== 0 ||
    value[1] !== 0 ||
    value[2] !== 0 ||
    value[3] !== 0 ||
    value[4] !== 0 ||
    value[5] !== 0xffff
  ) {
    return null;
  }

  const ipv4 = (value[6]! << 16) + value[7]!;
  return [
    (ipv4 >>> 24) & 0xff,
    (ipv4 >>> 16) & 0xff,
    (ipv4 >>> 8) & 0xff,
    ipv4 & 0xff,
  ].join(".");
}

export function isBlockedIpAddress(address: string) {
  const normalizedAddress = stripIpv6Brackets(address).toLowerCase();
  const version = isIP(normalizedAddress);

  if (version === 4) {
    return BLOCKED_IPV4_CIDRS.some(([base, bits]) =>
      isIpv4InCidr(normalizedAddress, base, bits),
    );
  }

  if (version === 6) {
    const mappedIpv4 = ipv4FromMappedIpv6(normalizedAddress);
    if (mappedIpv4) return isBlockedIpAddress(mappedIpv4);

    return BLOCKED_IPV6_CIDRS.some(([base, bits]) =>
      isIpv6InCidr(normalizedAddress, base, bits),
    );
  }

  return true;
}

function assertAllowedHostname(hostname: string) {
  const normalizedHostname = normalizeHostname(hostname);
  if (!normalizedHostname) {
    throw new UnsafeToolUrlError("URL must include a hostname");
  }

  if (
    BLOCKED_HOSTNAMES.has(normalizedHostname) ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.endsWith(".local")
  ) {
    throw new UnsafeToolUrlError("Local hostnames are not allowed");
  }

  if (isIP(normalizedHostname) && isBlockedIpAddress(normalizedHostname)) {
    throw new UnsafeToolUrlError("Private or local IP addresses are not allowed");
  }
}

async function resolvePublicHost(hostname: string) {
  const normalizedHostname = normalizeHostname(hostname);
  if (isIP(normalizedHostname)) {
    if (isBlockedIpAddress(normalizedHostname)) {
      throw new UnsafeToolUrlError("Private or local IP addresses are not allowed");
    }
    return;
  }

  let addresses: LookupAddress[];
  try {
    addresses = await lookup(normalizedHostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeToolUrlError("Unable to resolve hostname");
  }

  if (addresses.length === 0) {
    throw new UnsafeToolUrlError("Unable to resolve hostname");
  }

  if (addresses.some(({ address }) => isBlockedIpAddress(address))) {
    throw new UnsafeToolUrlError("Hostname resolves to a private or local IP address");
  }
}

export async function validatePublicToolUrl(input: string | URL) {
  let parsed: URL;
  try {
    parsed = input instanceof URL ? input : new URL(input);
  } catch {
    throw new UnsafeToolUrlError("Invalid URL");
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new UnsafeToolUrlError("Only HTTP and HTTPS URLs are allowed");
  }

  assertAllowedHostname(parsed.hostname);
  await resolvePublicHost(parsed.hostname);
  return parsed;
}

function mergeAbortSignals(
  first: AbortSignal | null | undefined,
  second: AbortSignal,
) {
  if (!first) return second;
  if (first.aborted) return first;

  const controller = new AbortController();
  const abort = () => controller.abort();
  first.addEventListener("abort", abort, { once: true });
  second.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

export async function safeToolFetch(
  input: string | URL,
  init: SafeToolFetchInit = {},
) {
  const {
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...fetchInit
  } = init;
  let currentUrl = await validatePublicToolUrl(input);

  for (
    let redirectCount = 0;
    redirectCount <= maxRedirects;
    redirectCount += 1
  ) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const response = await fetch(currentUrl.href, {
      ...fetchInit,
      redirect: "manual",
      signal: mergeAbortSignals(fetchInit.signal, timeoutSignal),
    });

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > maxResponseBytes) {
      await response.body?.cancel();
      throw new Error("Response is too large");
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) return response;
      if (redirectCount === maxRedirects) {
        throw new Error("Too many redirects");
      }

      currentUrl = await validatePublicToolUrl(new URL(location, currentUrl));
      if (
        response.status === 303 &&
        fetchInit.method &&
        fetchInit.method !== "GET"
      ) {
        fetchInit.method = "GET";
      }
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects");
}

export async function readResponseTextWithLimit(
  response: Response,
  maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
) {
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        throw new Error("Response is too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}
