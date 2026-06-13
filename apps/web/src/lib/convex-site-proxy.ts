import { convexSiteUrl } from "@/lib/auth-server";

/**
 * Forwards a request to the same path on the Convex .site deployment,
 * preserving cookies so the Convex httpAction can authenticate the session.
 * Used by the browser-extension endpoints (/api/bookmarks*), mirroring the
 * /api/auth/* proxy from @convex-dev/better-auth/react-start.
 */
export const proxyToConvexSite = (request: Request): Promise<Response> => {
  const requestUrl = new URL(request.url);
  const target = `${convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;
  const headers = new Headers(request.headers);
  // Hop-by-hop headers from the incoming request break the outbound fetch.
  headers.delete("transfer-encoding");
  headers.delete("content-length");
  headers.delete("connection");
  // Avoid compressed upstream bodies: fetch auto-decompresses but keeps the
  // content-encoding header, which corrupts the relayed response.
  headers.set("accept-encoding", "identity");
  headers.set("host", new URL(convexSiteUrl).host);
  headers.set("x-forwarded-host", requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(/:$/, ""));
  return fetch(target, {
    method: request.method,
    headers,
    redirect: "manual",
    body: request.body,
    // @ts-expect-error - duplex is required for streaming request bodies
    duplex: "half",
  });
};
