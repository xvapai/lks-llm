import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

const sealOptions = {
   password: process.env.AUTH_SECRET!,
};

async function encryptData(data: any): Promise<string> {
   if (!process.env.AUTH_SECRET) {
      throw new Error("AUTH_SECRET is not set in environment variables");
   }
   return sealData(data, { password: process.env.AUTH_SECRET });
}

async function decryptData(sealedData: string): Promise<any> {
   if (!process.env.AUTH_SECRET) {
      throw new Error("AUTH_SECRET is not set in environment variables");
   }
   try {
      return await unsealData(sealedData, { password: process.env.AUTH_SECRET });
   } catch (error) {
      console.error("Failed to decrypt data:", error);
      throw new Error("Invalid or corrupted session data");
   }
}

export async function setRefreshTokenCookie(token: string) {
   if (!token) {
      throw new Error("Token is required");
   }

   try {
      const encryptedToken = await encryptData(token);
      const cookieStore = await cookies();
      
      cookieStore.set('session_cookies', encryptedToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         maxAge: MAX_AGE,
         path: "/",
         sameSite: "lax", // Added for security
      });
   } catch (error) {
      console.error("Failed to set refresh token cookie:", error);
      throw new Error("Failed to set session cookie");
   }
}

export async function getRefreshTokenFromCookie(): Promise<string | null> {
   try {
      const cookieStore = await cookies();
      const encryptedToken = cookieStore.get('session_cookies')?.value;
      
      if (!encryptedToken) {
         return null;
      }

      const decryptedToken = await decryptData(encryptedToken);
      return decryptedToken;
   } catch (error) {
      console.error("Failed to get refresh token from cookie:", error);
      // Clear invalid cookie
      await clearRefreshTokenCookie();
      return null;
   }
}

export async function clearRefreshTokenCookie() {
   try {
      const cookieStore = await cookies();
      cookieStore.delete('session_cookies');
   } catch (error) {
      console.error("Failed to clear refresh token cookie:", error);
   }
}

// Utility functions for encrypting/decrypting generic data if needed
export async function encryptGenericData(data: any): Promise<string> {
   return encryptData(data);
}

export async function decryptGenericData(encryptedData: string): Promise<any> {
   return decryptData(encryptedData);
}
