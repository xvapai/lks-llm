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

interface RefreshTokenResult {
   accessToken: string;
   expiresIn: number;
   idToken: string;
}

interface UserInfo {
   name: string;
   email: string;
   id: string;
}

interface SignInResult {
   AccessToken: string;
   RefreshToken: string;
   IdToken: string;
   ExpiresIn: number;
}

export type { CognitoIdentityProviderClient };
export default cognitoClient;

export const getUserInfo = async (accessToken: string): Promise<UserInfo> => {
   try {
      const command = new GetUserCommand({
         AccessToken: accessToken,
      });
      const response = await cognitoClient.send(command);
      
      if (!response.UserAttributes) {
         throw new Error("User attributes not found in the response");
      }

      const getAttribute = (name: string): string => {
         return (
            response.UserAttributes?.find(
               (attr: AttributeType) => attr.Name === name
            )?.Value || ""
         );
      };

      return {
         name: getAttribute("name"),
         email: getAttribute("email"),
         id: getAttribute("sub"),
      };
   } catch (error) {
      throw error;
   }
};

export const refreshAccessToken = async (
   refreshToken: string
): Promise<RefreshTokenResult> => {
   if (!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
      console.error("COGNITO_CLIENT_ID is not set in environment variables");
      throw new Error("COGNITO_CLIENT_ID is not set in environment variables");
   }

   try {
      const command = new InitiateAuthCommand({
         AuthFlow: "REFRESH_TOKEN_AUTH",
         ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
         AuthParameters: {
            REFRESH_TOKEN: refreshToken,
         },
      });

      const response: InitiateAuthCommandOutput = await cognitoClient.send(
         command
      );

      if (
         !response.AuthenticationResult?.AccessToken ||
         !response.AuthenticationResult.ExpiresIn ||
         !response.AuthenticationResult.IdToken
      ) {
         throw new Error("Invalid response from Cognito");
      }

      return {
         accessToken: response.AuthenticationResult.AccessToken,
         expiresIn: response.AuthenticationResult.ExpiresIn,
         idToken: response.AuthenticationResult.IdToken,
      };
   } catch (error) {
      console.error("Refresh token error:", error);
      throw error;
   }
};

export const forgotPassword = async (username: string): Promise<any> => {
   try {
      const command = new ForgotPasswordCommand({
         ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID, // Fixed typo: NET_PUBLIC -> NEXT_PUBLIC
         Username: username,
      });
      await cognitoClient.send(command);
   } catch (error) {
      console.error("Forgot password error: ", error);
      throw error;
   }
};

export const signIn = async (email: string, password: string): Promise<SignInResult> => {
   if (!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
      throw new Error("COGNITO_CLIENT_ID is not set in environment variables");
   }

   try {
      const command = new InitiateAuthCommand({
         AuthFlow: "USER_PASSWORD_AUTH",
         ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
         AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
         },
      });

      const response = await cognitoClient.send(command);

      // Check if AuthenticationResult exists
      if (!response.AuthenticationResult) {
         // Handle cases where additional challenges are required (MFA, etc.)
         if (response.ChallengeName) {
            throw new Error(`Authentication requires additional step: ${response.ChallengeName}`);
         }
         throw new Error("Authentication failed - no result returned");
      }

      const { AccessToken, RefreshToken, IdToken, ExpiresIn } = response.AuthenticationResult;

      // Validate all required tokens are present
      if (!AccessToken || !RefreshToken || !IdToken) {
         throw new Error("Authentication failed - missing required tokens");
      }

      return {
         AccessToken,
         RefreshToken,
         IdToken,
         ExpiresIn: ExpiresIn || 3600,
      };
   } catch (error) {
      console.error("Sign in error:", error);
      throw error;
   }
};

export const signOut = async (accessToken: string): Promise<any> => {
   try {
      const command = new GlobalSignOutCommand({
         AccessToken: accessToken,
      });
      await cognitoClient.send(command);
   } catch (error) {
      console.error("Sign out error:", error);
      throw error;
   }
};
