import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import cognitoSignIn from "@/lib/cognito"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const response = await cognitoSignIn(
          credentials.email as string,
          credentials.password as string
        )

        if (!response) return null

        return {
          id: response.username,
          email: credentials.email,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
})
