import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  signIn as cognitoSignIn,
  getUserInfo,
  refreshAccessToken,
} from "@/lib/cognito";

class InvalidLoginError extends CredentialsSignin {
  code = "Invalid email or password";
}

const authSecret =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!authSecret) {
  throw new Error("AUTH_SECRET is not set");
}

const ID_TOKEN_EXPIRATION_MINUTES = Number(
  process.env.NEXT_PUBLIC_COGNITO_ID_TOKEN_EXPIRED ?? 60
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "cognito",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        try {
          const response = await cognitoSignIn(
            credentials.email,
            credentials.password
          );

          const { AccessToken, RefreshToken, IdToken, ExpiresIn } = response;

          if (!AccessToken || !RefreshToken) {
            throw new InvalidLoginError();
          }

          const user = await getUserInfo(AccessToken);

          return {
            ...user,
            accessToken: AccessToken,
            idToken: IdToken,
            refreshToken: RefreshToken,
            accessTokenExpires: Date.now() + ExpiresIn * 1000,
            idTokenExpires:
              Date.now() + ID_TOKEN_EXPIRATION_MINUTES * 60 * 1000,
          };
        } catch (error) {
          console.error("Cognito authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user;
      }

      if (
        token.user &&
        Date.now() > token.user.accessTokenExpires
      ) {
        try {
          const refreshed = await refreshAccessToken(
            token.user.refreshToken
          );

          token.user.accessToken = refreshed.accessToken;
          token.user.idToken = refreshed.idToken;
          token.user.accessTokenExpires =
            Date.now() + refreshed.expiresIn * 1000;
        } catch (error) {
          console.error("Refresh token failed", error);
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user = token.user as any;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});
