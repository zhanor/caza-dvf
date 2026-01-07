// On exporte directement la configuration par défaut de NextAuth
export { default } from "next-auth/middleware";

export const config = {
  // On protège tout sauf les pages publiques
  matcher: ["/((?!login|register|api|_next|favicon.ico).*)"],
};
