import { db, eq, listings } from "@db/client";
import { StatusCode } from "@shared/types/api";
import { ApiError } from "@web/src/server/utils/apiError";

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
