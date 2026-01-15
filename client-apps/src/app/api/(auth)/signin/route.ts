import { NextRequest, NextResponse } from "next/server";
import { signIn, getUserInfo } from "@/lib/cognito";
import { setRefreshTokenCookie } from "@/lib/cookies";
import { ResponseBody } from "@/lib/response";

export async function POST(request: NextRequest) {
  console.log("=== LOGIN API HIT ===");

  let body: any = null;

  try {
    body = await request.json();
    console.log("REQ BODY:", body);
  } catch (e) {
    console.error("REQ BODY PARSE ERROR:", e);
  }

  try {
    const email = body?.email;
    const password = body?.password;

    console.log("EMAIL:", email);
    console.log("PASSWORD EXISTS:", !!password);

    if (!email || !password) {
      throw new Error("Email or password missing");
    }

    console.log("CALL signIn()");
    const response = await signIn(email, password);

    console.log("SIGNIN RESPONSE TYPE:", typeof response);
    console.log("SIGNIN RESPONSE:", response);

    if (!response) {
      throw new Error("signIn returned null/undefined");
    }

    console.log("TOKENS CHECK");
    console.log("AccessToken:", !!response.AccessToken);
    console.log("IdToken:", !!response.IdToken);
    console.log("RefreshToken:", !!response.RefreshToken);

    const accessToken = response.AccessToken;
    const idToken = response.IdToken;
    const refreshToken = response.RefreshToken;

    if (!accessToken || !idToken || !refreshToken) {
      throw new Error("One or more tokens missing");
    }

    console.log("CALL getUserInfo()");
    let user: any = null;
    try {
      user = await getUserInfo(idToken);
      console.log("USER INFO TYPE:", typeof user);
      console.log("USER INFO:", user);
    } catch (e) {
      console.error("getUserInfo ERROR:", e);
      user = null;
    }

    console.log("SET REFRESH TOKEN COOKIE");
    await setRefreshTokenCookie(refreshToken);

    const rawBody = {
      status: "success",
      message: "User logged in successfully",
      data: {
        user: user ?? {},
        accessToken,
      },
    };

    console.log("RAW RESPONSE BODY:", rawBody);

    console.log("CALL ResponseBody()");
    return ResponseBody(rawBody, 200);

  } catch (error) {
    console.error("LOGIN API ERROR:", error);

    console.log("CALL ResponseBody(ERROR)");
    return ResponseBody(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      400
    );
  }
}
