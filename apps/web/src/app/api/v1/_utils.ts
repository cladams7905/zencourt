import { NextResponse } from "next/server";
import {
  requireAuthenticatedUser,
  requireListingAccess
} from "@web/src/server/auth/apiAuth";
import { ApiError } from "@web/src/server/utils/apiError";
import { StatusCode } from "@shared/types/api";
import {
  DomainError,
  isDomainError
} from "@web/src/server/errors/domain";
import { apiErrorCodeFromStatus } from "@shared/utils/api/responses";

export { ApiError, requireAuthenticatedUser, requireListingAccess, DomainError };

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
    if (isDomainError(err)) {
      const { status, code } = mapDomainError(err);
      return NextResponse.json(
        {
          success: false,
          code,
          error: err.message,
          message: err.message
        },
        { status }
      );
    }
    return errorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "Internal server error",
      fallbackMessage
    );
  }
}

export function mapDomainError(
  error: DomainError
): { status: number; code: ReturnType<typeof apiErrorCodeFromStatus> } {
  let status = StatusCode.INTERNAL_SERVER_ERROR;

  switch (error.kind) {
    case "validation":
      status = StatusCode.BAD_REQUEST;
      break;
    case "unauthorized":
      status = StatusCode.UNAUTHORIZED;
      break;
    case "forbidden":
      status = StatusCode.FORBIDDEN;
      break;
    case "not_found":
      status = StatusCode.NOT_FOUND;
      break;
    case "conflict":
      status = StatusCode.BAD_REQUEST;
      break;
    case "dependency":
      status = StatusCode.BAD_GATEWAY;
      break;
    case "internal":
    default:
      status = StatusCode.INTERNAL_SERVER_ERROR;
      break;
  }

  return {
    status,
    code: apiErrorCodeFromStatus(status)
  };
}
