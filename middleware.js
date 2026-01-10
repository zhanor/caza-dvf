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
    pathname.includes(".")
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

  // 4. Utilisateur NON connecté -> redirection vers /login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Utilisateur CONNECTÉ sur page publique -> redirection vers /
  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
