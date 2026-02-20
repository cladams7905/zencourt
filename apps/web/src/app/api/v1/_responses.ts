import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VIDEO_SERVER_ERROR"
  | "VIDEO_STATUS_ERROR"
  | "WEBHOOK_VERIFICATION_ERROR"
  | "INTERNAL_ERROR"
  | "DATABASE_ERROR";

export function apiErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      code,
      error: message,
      ...extra
    },
    { status }
  );
}
