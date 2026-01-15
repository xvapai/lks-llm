import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

const MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const COOKIE_NAME = "refresh_token";

/* ================= VALIDATION ================= */

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is not set in environment variables");
}

const sealOptions = {
  password: process.env.AUTH_SECRET,
};

/* ================= INTERNAL ================= */

async function encrypt(data: unknown): Promise<string> {
  return sealData(data, sealOptions);
}

async function decrypt<T>(sealed: string): Promise<T | null> {
  try {
    return (await unsealData(sealed, sealOptions)) as T;
  } catch (error) {
    console.error("Cookie decrypt failed:", error);
    return null;
  }
}

/* ================= PUBLIC API ================= */

export async function setRefreshTokenCookie(token: string) {
  if (!token) {
    throw new Error("Cannot set empty refresh token");
  }

  const encrypted = await encrypt(token);

  cookies().set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getRefreshTokenFromCookie(): Promise<string | null> {
  const cookie = cookies().get(COOKIE_NAME)?.value;
  if (!cookie) return null;

  return decrypt<string>(cookie);
}

export function clearRefreshTokenCookie() {
  cookies().delete(COOKIE_NAME);
}

/* ================= OPTIONAL GENERIC ================= */

export async function encryptGenericData(data: unknown): Promise<string> {
  return encrypt(data);
}

export async function decryptGenericData<T>(
  encrypted: string
): Promise<T | null> {
  return decrypt<T>(encrypted);
}
