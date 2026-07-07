import { convexSiteUrl } from "@/lib/auth-server";

/**
 * Forwards a request to the Convex .site deployment, preserving cookies so
 * the Convex httpAction can authenticate the session.
 */
export const proxyToConvexSite = (
  request: Request,
  targetPath?: string,
): Promise<Response> => {
  const requestUrl = new URL(request.url);
  const targetUrl = new URL(targetPath ?? requestUrl.pathname, convexSiteUrl);
  targetUrl.search = requestUrl.search;
  const headers = new Headers(request.headers);
  // Hop-by-hop headers from the incoming request break the outbound fetch.
  headers.delete("transfer-encoding");
  headers.delete("content-length");
  headers.delete("connection");
  // Avoid compressed upstream bodies: fetch auto-decompresses but keeps the
  // content-encoding header, which corrupts the relayed response.
  headers.set("accept-encoding", "identity");
  headers.set("host", targetUrl.host);
  headers.set("x-forwarded-host", requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(/:$/, ""));
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (
    request.body !== null &&
    request.method !== "GET" &&
    request.method !== "HEAD"
  ) {
    init.body = request.body;
    init.duplex = "half";
  }
  return fetch(targetUrl, init);
};
