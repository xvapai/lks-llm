import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

async function encryptData(data: any): Promise<string> {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is not set");
  }

  return sealData(data, {
    password: process.env.AUTH_SECRET,
  });
}

async function decryptData(sealedData: string): Promise<any> {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is not set");
  }

  return unsealData(sealedData, {
    password: process.env.AUTH_SECRET,
  });
}

export async function setRefreshTokenCookie(token: string) {
  const encryptedToken = await encryptData(token);
  const cookieStore = cookies(); // ❗ TANPA await

  cookieStore.set("session_cookies", encryptedToken, {
    httpOnly: true,
    secure: true, // WAJIB di Amplify
    maxAge: MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
}

export async function getRefreshTokenFromCookie(): Promise<string | null> {
  const cookieStore = cookies();
  const encryptedToken = cookieStore.get("session_cookies")?.value;

  if (!encryptedToken) return null;

  try {
    return await decryptData(encryptedToken);
  } catch {
    cookieStore.delete("session_cookies");
    return null;
  }
}

export async function clearRefreshTokenCookie() {
  cookies().delete("session_cookies");
}
