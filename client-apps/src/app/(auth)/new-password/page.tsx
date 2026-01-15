'use client';

import {
  CognitoIdentityProviderClient,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const signUpSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/,
        "Password must contain uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type SignUpFormInputs = z.infer<typeof signUpSchema>;

export default function NewPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const session = searchParams.get("session");
  const username = searchParams.get("username");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormInputs>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit: SubmitHandler<SignUpFormInputs> = async (data) => {
    if (!session || !username) {
      setError("Invalid password reset session.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const client = new CognitoIdentityProviderClient({
        region: process.env.NEXT_PUBLIC_COGNITO_REGION,
      });

      await client.send(
        new RespondToAuthChallengeCommand({
          ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          Session: session,
          ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: data.password,
          },
        })
      );

      const result = await signIn("cognito", {
        email: username,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.replace("/");
    } catch (err) {
      console.error(err);
      setError("Failed to set new password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-accent p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-xl font-bold">Set New Password</h1>
          <p className="text-xs text-muted-foreground">
            Your new password must be different from the previous one
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              appendIcon={
                showPassword ? (
                  <EyeOffIcon
                    className="h-4 w-4 cursor-pointer"
                    onClick={() => setShowPassword(false)}
                  />
                ) : (
                  <EyeIcon
                    className="h-4 w-4 cursor-pointer"
                    onClick={() => setShowPassword(true)}
                  />
                )
              }
              error={errors.password?.message}
              {...register("password")}
            />
          </div>

          <div>
            <Label>Confirm Password</Label>
            <Input
              type={showConfirmPassword ? "text" : "password"}
              appendIcon={
                showConfirmPassword ? (
                  <EyeOffIcon
                    className="h-4 w-4 cursor-pointer"
                    onClick={() => setShowConfirmPassword(false)}
                  />
                ) : (
                  <EyeIcon
                    className="h-4 w-4 cursor-pointer"
                    onClick={() => setShowConfirmPassword(true)}
                  />
                )
              }
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </div>

          <Separator />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Updating..." : "Set New Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
