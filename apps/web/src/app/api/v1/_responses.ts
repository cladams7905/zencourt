import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@shared/types/api";
import { StatusCode } from "@shared/types/api";
import {
  apiErrorCodeFromStatus,
  buildApiErrorBody
} from "@shared/utils/api/responses";

export type { ApiErrorCode };
export { StatusCode };

export function apiErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(buildApiErrorBody(code, message, extra), { status });
}
export { apiErrorCodeFromStatus };
