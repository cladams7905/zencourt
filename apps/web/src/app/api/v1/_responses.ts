import { NextResponse } from "next/server";
import { StatusCode, type ApiErrorCode } from "@shared/types/api";
import {
  apiErrorCodeFromStatus,
  buildApiErrorBody
} from "@shared/utils/api/responses";

export { StatusCode, apiErrorCodeFromStatus };
export type { ApiErrorCode };

export function apiErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(buildApiErrorBody(code, message, extra), { status });
}
