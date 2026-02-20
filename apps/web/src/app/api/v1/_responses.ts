import { NextResponse } from "next/server";
import { StatusCode } from "@web/src/app/api/v1/_statusCodes";

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

export function apiErrorCodeFromStatus(status: number): ApiErrorCode {
  if (status === StatusCode.UNAUTHORIZED) return "UNAUTHORIZED";
  if (status === StatusCode.FORBIDDEN) return "FORBIDDEN";
  if (status === StatusCode.NOT_FOUND) return "NOT_FOUND";
  return "INVALID_REQUEST";
}
