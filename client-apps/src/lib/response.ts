import { NextResponse } from "next/server";

export interface BodyTypes {
  status?: string;
  message?: string;
  data?: unknown;
  errField?: unknown;
}

export const ResponseBody = (
  body: BodyTypes | null | undefined,
  status = 200
) => {
  /* ===== HARD GUARD ===== */
  if (!body || typeof body !== "object") {
    body = {
      status: "error",
      message: "Invalid response body",
    };
  }

  /* ===== NORMALIZE ===== */
  const normalized = {
    status: body.status ?? "success",
    message: body.message ?? "",
    ...(body.data !== undefined && {
      data:
        typeof body.data === "object" && body.data !== null
          ? body.data
          : {},
    }),
    ...(body.errField !== undefined && {
      errField:
        typeof body.errField === "object" && body.errField !== null
          ? body.errField
          : {},
    }),
  };

  return NextResponse.json(normalized, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
