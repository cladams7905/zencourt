import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser
} from "@web/src/app/api/v1/_utils";
import { getUserListingSummariesPage } from "@web/src/server/actions/db/listings";
import { apiErrorResponse } from "@web/src/app/api/v1/_responses";

const clampNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = request.nextUrl;
    const limit = clampNumber(searchParams.get("limit"), 10);
    const offset = clampNumber(searchParams.get("offset"), 0);

    const result = await getUserListingSummariesPage(user.id, {
      limit,
      offset
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(
        error.status,
        error.status === 401
          ? "UNAUTHORIZED"
          : error.status === 403
            ? "FORBIDDEN"
            : error.status === 404
              ? "NOT_FOUND"
              : "INVALID_REQUEST",
        error.body.message
      );
    }
    return apiErrorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  }
}
