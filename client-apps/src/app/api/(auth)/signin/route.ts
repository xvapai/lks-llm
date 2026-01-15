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

    if (!response || typeof response !== "object") {
      throw new Error("Invalid sign-in response");
    }

    const refreshToken = response.RefreshToken;
    const accessToken = response.AccessToken;

    if (!refreshToken || !accessToken) {
      throw new Error("Missing tokens from Cognito");
    }

    const user = await getUserInfo(accessToken).catch(() => ({}));
    await setRefreshTokenCookie(refreshToken);

    return ResponseBody({
      status: "success",
      message: "User logged in successfully",
      data: {
        user: user ?? {},
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
