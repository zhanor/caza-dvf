import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import pool from "@/lib/db";

// bcryptjs avec require() - compatible webpack (sans Turbopack)
const bcrypt = require("bcryptjs");

export const authOptions = {
  debug: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        console.log("--> 1. Tentative de connexion pour :", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        try {
          const query = 'SELECT id, email, password, name FROM users WHERE email = $1';
          const values = [credentials.email.toLowerCase().trim()];
          
          console.log("--> 2. Envoi de la requête DB...");
          const result = await pool.query(query, values);
          console.log("--> 3. Réponse DB reçue. Utilisateur trouvé ?", result.rows.length > 0);

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];

          console.log("--> 4. Vérification du mot de passe...");
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          console.log("--> 5. Mot de passe valide ?", isPasswordValid);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("❌ ERREUR FATALE DANS AUTHORIZE :", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
