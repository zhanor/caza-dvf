export { default } from "next-auth/middleware";

export const config = {
  // Protège toutes les routes sauf login, register, api/auth et fichiers statiques
  matcher: [
    "/((?!login|register|api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
