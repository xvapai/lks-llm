import { NextResponse } from "next/server";

interface SuccessResponse {
   status: "success";
   message: string;
   data?: any;
}

interface ErrorResponse {
   status: "error";
   message: string;
   errField?: any;
}

type ApiResponse = SuccessResponse | ErrorResponse;

export const ResponseBody = (body: ApiResponse, status: number): NextResponse => {
   return NextResponse.json(body, {
      headers: {
         "Content-Type": "application/json",
      },
      status,
   });
};

// Helper functions for common responses
export const SuccessResponse = (message: string, data?: any, status: number = 200): NextResponse => {
   return ResponseBody(
      {
         status: "success",
         message,
         data,
      },
      status
   );
};

export const ErrorResponse = (message: string, status: number = 400, errField?: any): NextResponse => {
   return ResponseBody(
      {
         status: "error",
         message,
         errField,
      },
      status
   );
};

// Specific error helpers
export const BadRequestResponse = (message: string, errField?: any): NextResponse => {
   return ErrorResponse(message, 400, errField);
};

export const UnauthorizedResponse = (message: string = "Unauthorized"): NextResponse => {
   return ErrorResponse(message, 401);
};

export const ForbiddenResponse = (message: string = "Forbidden"): NextResponse => {
   return ErrorResponse(message, 403);
};

export const NotFoundResponse = (message: string = "Not found"): NextResponse => {
   return ErrorResponse(message, 404);
};

export const InternalServerErrorResponse = (message: string = "Internal server error"): NextResponse => {
   return ErrorResponse(message, 500);
};
