import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// This function can be marked `async` if using `await` inside
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
