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

  // Récupérer l'origine de la requête
  const origin = request.headers.get("origin") || "";

  // Vérifier si la requête concerne les routes d'API qui nécessitent CORS
  if (
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname.startsWith("/api/bookmarks")
  ) {
    // Créer une réponse
    const response = NextResponse.next();

    // Ajouter les en-têtes CORS dynamiquement
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
    );

    return response;
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
