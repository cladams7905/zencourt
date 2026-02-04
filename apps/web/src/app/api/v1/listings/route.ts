import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser
} from "@web/src/app/api/v1/_utils";
import { getUserListingSummariesPage } from "@web/src/server/actions/db/listings";

const clampNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  let userId: string;
  try {
    const user = await requireAuthenticatedUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    throw error;
  }

  const { searchParams } = request.nextUrl;
  const limit = clampNumber(searchParams.get("limit"), 10);
  const offset = clampNumber(searchParams.get("offset"), 0);

  const result = await getUserListingSummariesPage(userId, {
    limit,
    offset
  });

  return NextResponse.json(result);
}
