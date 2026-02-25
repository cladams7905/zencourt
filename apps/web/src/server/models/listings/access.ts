import { and, db, eq, listings } from "@db/client";
import { StatusCode } from "@shared/types/api";
import { ApiError } from "@web/src/server/errors/api";

type Listing = typeof listings.$inferSelect;

/**
 * Ensures the user has access to the listing (listing exists and belongs to user).
 * Throws ApiError with appropriate status when access is denied.
 * Used by API routes and server code that need listing access checks.
 */
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
    .where(and(eq(listings.id, listingId), eq(listings.userId, userId)))
    .limit(1);

  const listing = listingResult[0];

  if (listing) {
    return listing;
  }

  // Preserve existing 404 vs 403 behavior while keeping a fast path for valid ownership.
  const existsResult = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (existsResult.length === 0) {
    throw new ApiError(StatusCode.NOT_FOUND, {
      error: "Not found",
      message: "Listing not found"
    });
  }

  throw new ApiError(StatusCode.FORBIDDEN, {
    error: "Forbidden",
    message: "You don't have access to this listing"
  });
}
