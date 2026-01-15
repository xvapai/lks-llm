import { NextRequest } from "next/server";
import { signIn, getUserInfo } from "@/lib/cognito";
import { setRefreshTokenCookie } from "@/lib/cookies";
import { 
   SuccessResponse, 
   BadRequestResponse, 
   UnauthorizedResponse, 
   InternalServerErrorResponse 
} from "@/lib/response";

export async function POST(request: NextRequest) {
   try {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
         return BadRequestResponse("Email and password are required");
      }

      const response = await signIn(email, password);
      
      if (!response) {
         return UnauthorizedResponse("Authentication failed");
      }

      const { RefreshToken: refreshToken, AccessToken: accessToken } = response;

      if (!refreshToken || !accessToken) {
         return UnauthorizedResponse("Authentication failed - missing tokens");
      }

      const user = await getUserInfo(accessToken);
      
      if (!user) {
         return InternalServerErrorResponse("Failed to retrieve user information");
      }

      await setRefreshTokenCookie(refreshToken);

      return SuccessResponse(
         "User logged in successfully",
         { user, accessToken }
      );

   } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error) {
         return BadRequestResponse(error.message);
      }

      return InternalServerErrorResponse();
   }
}
