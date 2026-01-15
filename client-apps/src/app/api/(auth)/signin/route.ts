import { NextRequest, NextResponse } from "next/server";
import { signIn, getUserInfo } from "@/lib/cognito";
import { setRefreshTokenCookie } from "@/lib/cookies";
import { ResponseBody } from "@/lib/response";

export async function POST(request: NextRequest) {
  console.log("=== LOGIN API HIT ===");

  try {
    const body = await request.json();
    console.log("REQ BODY:", body);

    const { email, password } = body ?? {};
    console.log("EMAIL:", email);
    console.log("PASSWORD EXISTS:", !!password);

    if (!email || !password) {
      return ResponseBody(
        {
          status: "error",
          message: "Email and password are required",
        },
        400
      );
    }

    console.log("CALL signIn()");
    const response = await signIn(email, password);

    console.log("SIGNIN RESPONSE:", response);

    const accessToken = response?.AccessToken;
    const refreshToken = response?.RefreshToken;

    console.log("TOKENS CHECK");
    console.log("AccessToken:", !!accessToken);
    console.log("RefreshToken:", !!refreshToken);

    if (!accessToken || !refreshToken) {
      throw new Error("Failed to get access or refresh token");
    }

    console.log("CALL getUserInfo()");
    let user = {};

    try {
      // 🔴 PENTING: HARUS AccessToken, BUKAN IdToken
      user = await getUserInfo(accessToken);
    } catch (err) {
      console.error("getUserInfo ERROR:", err);
      user = {}; // ⛑️ jangan pernah undefined
    }

    console.log("SET REFRESH TOKEN COOKIE");
    await setRefreshTokenCookie(refreshToken);

    return ResponseBody(
      {
        status: "success",
        message: "User logged in successfully",
        data: {
          user,
          accessToken,
        },
      },
      200
    );
  } catch (error) {
    console.error("LOGIN API ERROR:", error);

    if (error instanceof Error) {
      return ResponseBody(
        {
          status: "error",
          message: error.message,
        },
        400
      );
    }

    return ResponseBody(
      {
        status: "error",
        message: "Internal server error",
      },
      500
    );
  }
}
