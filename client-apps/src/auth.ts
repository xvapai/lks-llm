import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { signIn as cognitoSignIn, getUserInfo, refreshAccessToken } from "@/lib/cognito";

// DEBUG: Log environment variables
console.log("=== AUTH.TS DEBUG ===");
console.log("AUTH_SECRET exists:", !!process.env.AUTH_SECRET);
console.log("AUTH_SECRET length:", process.env.AUTH_SECRET?.length);
console.log("NEXTAUTH_SECRET exists:", !!process.env.NEXTAUTH_SECRET);
console.log("All env keys:", Object.keys(process.env).filter(k => k.includes('SECRET')));
console.log("====================");

class InvalidLoginError extends CredentialsSignin {
   code = "Invalid identifier or password";
}

const ID_TOKEN_EXPIRATION_MINUTES = parseInt(
   process.env.NEXT_PUBLIC_COGNITO_ID_TOKEN_EXPIRED || '60', 
   10
);
const ID_TOKEN_EXPIRATION_SECONDS = ID_TOKEN_EXPIRATION_MINUTES * 60;

// Try multiple secret sources as fallback
const authSecret = process.env.AUTH_SECRET || 
                   process.env.NEXTAUTH_SECRET || 
                   process.env.AUTH_SECRET_KEY;

if (!authSecret) {
   console.error("CRITICAL: No AUTH_SECRET found in environment!");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
   secret: authSecret,
   session: {
      strategy: "jwt",
   },
   providers: [
      Credentials({
         name: "cognito",
         credentials: {
            email: { label: "email", type: "text" },
            password: { label: "Password", type: "password" },
         },
         async authorize(credentials) {
            try {
               if (!credentials?.email || !credentials?.password) {
                  return null;
               }

               const response = await cognitoSignIn(
                  credentials.email as string,
                  credentials.password as string
               );

               const { RefreshToken, AccessToken, IdToken, ExpiresIn } = response;

               if (!RefreshToken || !AccessToken) {
                  throw new InvalidLoginError();
               }

               const user = await getUserInfo(AccessToken);

               return {
                  ...user,
                  accessToken: AccessToken,
                  idToken: IdToken,
                  refreshToken: RefreshToken,
                  accessTokenExpires: Date.now() + ExpiresIn * 1000,
                  idTokenExpires: Date.now() + ID_TOKEN_EXPIRATION_SECONDS * 1000,
               };
            } catch (error) {
               console.error("Cognito auth error:", error);
               return null;
            }
         },
      }),
   ],
   trustHost: true,
   callbacks: {
      async jwt({ token, user }: any) {
         if (user) {
            token.user = user;
         }

         if (
            token.user &&
            (
               (typeof token.user.accessTokenExpires === "number" && Date.now() > token.user.accessTokenExpires) ||
               (typeof token.user.idTokenExpires === "number" && Date.now() > token.user.idTokenExpires)
            )
         ) {
            try {
               const refreshedTokens = await refreshAccessToken(
                  token.user.refreshToken
               );

               if (refreshedTokens) {
                  token.user.accessToken = refreshedTokens.accessToken;
                  token.user.idToken = refreshedTokens.idToken;
                  token.user.accessTokenExpires =
                     Date.now() + refreshedTokens.expiresIn * 1000;
                  token.user.idTokenExpires = 
                     Date.now() + ID_TOKEN_EXPIRATION_SECONDS * 1000;
               } else {
                  token.error = "RefreshAccessTokenError";
               }
            } catch (error) {
               console.error("Error refreshing access token", error);
               token.error = "RefreshAccessTokenError";
            }
         }

         return token;
      },
      async session({ session, token }: any) {
         session.user = token.user as any;
         session.error = token.error;
         return session;
      },
   },
   pages: {
      signIn: "/signin",
   },
});
