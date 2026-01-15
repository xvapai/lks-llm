import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

/**
 * VALIDASI ENV
 * Penting: Amplify kadang build tanpa inject env → ini mencegah silent error
 */
if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is not set. Please define it in Amplify Environment Variables.");
}

/**
 * CONFIG AUTH
 */
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        /**
         * ⚠️ CONTOH LOGIC SAJA
         * Ganti dengan:
         * - API call ke backend
         * - DB query
         */
        if (
          credentials.email === "admin@example.com" &&
          credentials.password === "password123"
        ) {
          return {
            id: "1",
            name: "Admin",
            email: "admin@example.com",
          };
        }

        return null;
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  trustHost: true, // ⬅️ WAJIB untuk Amplify / serverless
};

/**
 * EXPORT HANDLER
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
