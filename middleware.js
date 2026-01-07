import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // On protège tout SAUF le login, le register, les api et les images
  matcher: [
    "/((?!login|register|api|_next/static|_next/image|favicon.ico).*)",
  ],
};
