import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.slice(1);

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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
