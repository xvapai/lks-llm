import { NextRequest, NextResponse } from "next/server";
import { signIn, getUserInfo } from "@/lib/cognito";
import { setRefreshTokenCookie } from "@/lib/cookies";
import { ResponseBody } from "@/lib/response";

export async function POST(request: NextRequest) {
   try {
      const body = await request.json();
      const { email, password } = body;

      // Validate input
      if (!email || !password) {
         return ResponseBody({
            status: "error",
            message: "Email and password are required",
         }, 400);
      }

      const response = await signIn(email, password);
      
      // Check if response exists
      if (!response) {
         return ResponseBody({
            status: "error",
            message: "Authentication failed - no response from sign in",
         }, 401);
      }

      console.log('Sign in response:', response);

      const refreshToken = response.RefreshToken;
      const accessToken = response.AccessToken;

      if (!refreshToken || !accessToken) {
         return ResponseBody({
            status: "error",
            message: "Authentication failed - missing tokens",
         }, 401);
      }

      const user = await getUserInfo(accessToken);
      
      if (!user) {
         return ResponseBody({
            status: "error",
            message: "Failed to retrieve user information",
         }, 500);
      }

      await setRefreshTokenCookie(refreshToken);

      const rawBody = {
         status: "success",
         message: "User logged in successfully",
         data: {
            user,
            accessToken,
         }
      };

      return ResponseBody(rawBody, 200);

   } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error) {
         return ResponseBody({
            status: "error",
            message: error.message,
         }, 400);
      }

      return ResponseBody({
         status: "error",
         message: "Internal server error",
      }, 500);
   }
}
