import { NextRequest, NextResponse } from "next/server";
import { signIn, getUserInfo } from "@/lib/cognito";
import { setRefreshTokenCookie } from "@/lib/cookies";
import { ResponseBody } from "@/lib/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      throw new Error("Email and password required");
    }

    const response = await signIn(email, password);
    
    const refreshToken = response.RefreshToken;
    const accessToken = response.AccessToken;
    const idToken = response.IdToken;
    
    if (!refreshToken || !accessToken || !idToken) {
      throw new Error("Missing Cognito tokens");
    }
    
    const user = getUserInfo(idToken); // 🔥 FIX DI SINI
    await setRefreshTokenCookie(refreshToken);
    
    return ResponseBody({
      status: "success",
      message: "User logged in successfully",
      data: {
        user,
        accessToken,
      }
    }, 200);

  } catch (error) {
    return ResponseBody({
      status: "error",
      message: error instanceof Error ? error.message : "Internal server error",
    }, 400);
  }
}
