import { db, listings } from "@db/client";
import { stackServerApp } from "@web/src/lib/core/auth/stack/server";
import type { CurrentServerUser } from "@stackframe/stack";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { StatusCode } from "@web/src/app/api/v1/_statusCodes";

type Listing = typeof listings.$inferSelect;

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error: string; message: string }
  ) {
    super(body.message);
    this.name = "ApiError";
  }
}

export async function requireAuthenticatedUser(): Promise<CurrentServerUser> {
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new ApiError(StatusCode.UNAUTHORIZED, {
      error: "Unauthorized",
      message: "Please sign in to continue"
    });
  }

  return user;
}

export async function requireListingAccess(
  listingId: string | null | undefined,
  userId: string
): Promise<Listing> {
  if (!listingId) {
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message: "Listing ID is required"
    });
  }

  const listingResult = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  const listing = listingResult[0];

  if (!listing) {
    throw new ApiError(StatusCode.NOT_FOUND, {
      error: "Not found",
      message: "Listing not found"
    });
  }

  if (listing.userId !== userId) {
    throw new ApiError(StatusCode.FORBIDDEN, {
      error: "Forbidden",
      message: "You don't have access to this listing"
    });
  }

  return listing;
}

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
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.status, error.body.error, error.body.message);
    }
    return errorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "Internal server error",
      error instanceof Error ? error.message : fallbackMessage
    );
  }
}
