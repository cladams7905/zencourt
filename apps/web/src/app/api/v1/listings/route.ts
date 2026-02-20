import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireAuthenticatedUser } from "@web/src/app/api/v1/_utils";
import { getUserListingSummariesPage } from "@web/src/server/actions/db/listings";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";

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
        apiErrorCodeFromStatus(error.status),
        error.body.message
      );
    }
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  }
}
