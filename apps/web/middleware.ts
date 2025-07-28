import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateHeaders } from "./src/lib/cors";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.slice(1);

  // Handle CORS for all /api routes
  if (request.nextUrl.pathname.startsWith("/api")) {
    // For OPTIONS requests, return early with CORS headers
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 200 });
      updateHeaders(response.headers, request);
      return response;
    }

    // For other API requests, continue with the request and add CORS headers to response
    const response = NextResponse.next();
    updateHeaders(response.headers, request);
    return response;
  }

  try {
    const url = new URL(pathname);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return NextResponse.redirect(
        new URL(`/api/b?url=${encodeURIComponent(pathname)}`, request.url),
      );
    }
  } catch {
    // ignore
  }

  if (request.nextUrl.pathname === "/") {
    const session = getSessionCookie(request, {
      cookiePrefix: "save-it",
    });

    if (session) {
      const url = new URL(request.url);
      url.pathname = "/app";
      return NextResponse.redirect(url.toString());
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
