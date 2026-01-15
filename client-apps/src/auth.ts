import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is not set");
}

const authConfig: NextAuthConfig = {
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

        if (
          credentials.email === "admin@example.com" &&
          credentials.password === "password123"
        ) {
          return {
            id: "1",
            email: "admin@example.com",
            name: "Admin",
          };
        }

        return null;
      },
    }),
  ],

  trustHost: true,
};

const handler = NextAuth(authConfig);

export const GET = handler;
export const POST = handler;

// Optional exports
export const auth = handler.auth;
export const signIn = handler.signIn;
export const signOut = handler.signOut;
