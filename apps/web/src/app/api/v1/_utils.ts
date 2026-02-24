import { NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "@web/src/server/utils/apiAuth";
import { StatusCode } from "@web/src/server/utils/apiResponses";

export { ApiError, requireAuthenticatedUser, requireListingAccess };

export function errorResponse(
  status: number,
  error: string,
  message: string
): NextResponse {
  return NextResponse.json({ error, message }, { status });
}

export async function withApiErrorHandling<T>(
  fn: () => Promise<NextResponse<T>>,
  fallbackMessage = "An unexpected error occurred"
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      return errorResponse(err.status, err.body.error, err.body.message);
    }
    return errorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "Internal server error",
      fallbackMessage
    );
  }
}
