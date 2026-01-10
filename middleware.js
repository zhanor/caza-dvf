import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes publiques (accessibles sans connexion)
const publicRoutes = ["/login", "/register"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Autoriser les fichiers statiques et ressources Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // fichiers avec extension (favicon.ico, images, etc.)
  ) {
    return NextResponse.next();
  }

  // 2. Autoriser les routes API d'authentification
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 3. Récupérer le token de session
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const isPublicRoute = publicRoutes.includes(pathname);

  // 4. Utilisateur NON connecté
  if (!isAuthenticated) {
    // S'il essaie d'accéder à une route protégée -> redirection vers /login
    if (!isPublicRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Sinon, autoriser l'accès aux routes publiques
    return NextResponse.next();
  }

  // 5. Utilisateur CONNECTÉ
  if (isAuthenticated) {
    // S'il essaie d'aller sur /login ou /register -> redirection vers /
    if (isPublicRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 6. Autoriser par défaut
  return NextResponse.next();
}

export const config = {
  // Matcher : toutes les routes sauf les fichiers statiques
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
