import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = `save-it.session_token`;

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.slice(1);

  try {
    const url = new URL(pathname);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return NextResponse.redirect(
        new URL(`/api/b?url=${encodeURIComponent(pathname)}`, request.url),
      );
    }
  } catch {}

  if (request.nextUrl.pathname === "/") {
    const cookieReq = request.cookies.get(COOKIE_NAME);

    if (cookieReq) {
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
