import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  InitiateAuthCommand,
  InitiateAuthCommandOutput,
  AttributeType,
  ForgotPasswordCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/* ================= TYPES ================= */

export interface RefreshTokenResult {
  accessToken: string;
  expiresIn: number;
  idToken: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
}

/* ================= HELPERS ================= */

const getAttr = (
  attrs: AttributeType[] | undefined,
  name: string
): string => {
  return attrs?.find((a) => a.Name === name)?.Value ?? "";
};

/* ================= AUTH ================= */

export const signIn = async (email: string, password: string) => {
  if (!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
    throw new Error("COGNITO_CLIENT_ID is not set");
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const response = await cognitoClient.send(command);

  if (!response.AuthenticationResult) {
    throw new Error("Authentication failed");
  }

  return response.AuthenticationResult;
};

/* ================= USER ================= */

export const getUserInfo = async (
  accessToken: string
): Promise<UserInfo> => {
  if (!accessToken) {
    console.warn("getUserInfo called without accessToken");
    return { id: "", email: "", name: "" };
  }

  try {
    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const response = await cognitoClient.send(command);

    return {
      id: getAttr(response.UserAttributes, "sub"),
      email: getAttr(response.UserAttributes, "email"),
      name: getAttr(response.UserAttributes, "name"),
    };
  } catch (error) {
    console.error("getUserInfo error:", error);
    return { id: "", email: "", name: "" }; // ⛑️ NEVER throw
  }
};

/* ================= REFRESH ================= */

export const refreshAccessToken = async (
  refreshToken: string
): Promise<RefreshTokenResult> => {
  if (!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
    throw new Error("COGNITO_CLIENT_ID is not set");
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  const response: InitiateAuthCommandOutput =
    await cognitoClient.send(command);

  const result = response.AuthenticationResult;

  if (!result?.AccessToken || !result.ExpiresIn || !result.IdToken) {
    throw new Error("Invalid refresh token response");
  }

  return {
    accessToken: result.AccessToken,
    expiresIn: result.ExpiresIn,
    idToken: result.IdToken,
  };
};

/* ================= PASSWORD ================= */

export const forgotPassword = async (username: string) => {
  if (!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
    throw new Error("COGNITO_CLIENT_ID is not set");
  }

  const command = new ForgotPasswordCommand({
    ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    Username: username,
  });

  await cognitoClient.send(command);
};

/* ================= SIGN OUT ================= */

export const signOut = async (accessToken: string) => {
  if (!accessToken) return;

  const command = new GlobalSignOutCommand({
    AccessToken: accessToken,
  });

  await cognitoClient.send(command);
};

export default cognitoClient;
