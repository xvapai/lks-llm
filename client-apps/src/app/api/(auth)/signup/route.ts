import { NextRequest } from "next/server";
import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import cognitoClient from "@/lib/cognito";
import { z } from "zod";
import { ResponseBody } from "@/lib/response";

const signUpSchema = z.object({
   fullName: z.string().min(1, { message: "Full name is required" }),
   email: z
      .string()
      .min(1, { message: "Email is required" })
      .email("Invalid email address"),
   password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .regex(
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).*$/,
         {
            message:
               "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
         }
      ),
});

export async function POST(request: NextRequest) {
   try {
      const body = await request.json();
      const validatedData = signUpSchema.parse(body);
      const { fullName, email, password } = validatedData;

      if (!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
         return ResponseBody(
            {
               status: "error" as const,
               message: "Cognito client configuration is missing",
            },
            500
         );
      }

      const command = new SignUpCommand({
         ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
         Username: email,
         Password: password,
         UserAttributes: [
            {
               Name: "name",
               Value: fullName,
            },
            {
               Name: "email",
               Value: email,
            },
         ],
      });

      await cognitoClient.send(command);

      return ResponseBody(
         {
            status: "success" as const,
            message: "User created successfully. Please check your email to verify your account.",
         },
         201
      );
   } catch (error) {
      console.error("Sign up error:", error);

      if (error instanceof z.ZodError) {
         const errField: Record<string, string> = {};
         error.errors.forEach((err) => {
            errField[err.path.join(".")] = err.message;
         });
         return ResponseBody(
            {
               status: "error" as const,
               message: "Validation error",
               errField,
            },
            400
         );
      }

      // Handle Cognito-specific errors
      if (error instanceof Error) {
         let message = error.message;
         let status = 400;

         // Map common Cognito errors to user-friendly messages
         if (error.name === "UsernameExistsException") {
            message = "An account with this email already exists";
         } else if (error.name === "InvalidPasswordException") {
            message = "Password does not meet requirements";
         } else if (error.name === "InvalidParameterException") {
            message = "Invalid input parameters";
         } else if (error.name === "TooManyRequestsException") {
            message = "Too many requests. Please try again later";
            status = 429;
         } else if (error.name === "LimitExceededException") {
            message = "Rate limit exceeded. Please try again later";
            status = 429;
         }

         return ResponseBody(
            {
               status: "error" as const,
               message,
            },
            status
         );
      }

      return ResponseBody(
         {
            status: "error" as const,
            message: "An unexpected error occurred during sign up",
         },
         500
      );
   }
}
