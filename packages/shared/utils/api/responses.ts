import { ApiErrorBody, ApiErrorCode, StatusCode } from "../../types/api/http";

export function buildApiErrorBody(
  code: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>
): ApiErrorBody & Record<string, unknown> {
  return {
    success: false,
    code,
    error: message,
    ...extra
  };
}

export function apiErrorCodeFromStatus(status: number): ApiErrorCode {
  if (status === StatusCode.UNAUTHORIZED) return "UNAUTHORIZED";
  if (status === StatusCode.FORBIDDEN) return "FORBIDDEN";
  if (status === StatusCode.NOT_FOUND) return "NOT_FOUND";
  return "INVALID_REQUEST";
}
