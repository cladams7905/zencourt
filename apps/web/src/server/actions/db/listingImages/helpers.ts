import { and, db, eq, listings } from "@db/client";
import type { DBListing } from "@db/types/models";
import { requireListingId, requireUserId } from "@web/src/server/actions/shared/validation";

async function assertListingOwnership(
  userId: string,
  listingId: string
): Promise<DBListing> {
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.userId, userId)))
    .limit(1);

  if (!listing) {
    throw new Error("Listing not found");
  }

  return listing as DBListing;
}

export async function ensureListingImageAccess(
  userId: string,
  listingId: string,
  {
    userIdError,
    listingIdError
  }: {
    userIdError: string;
    listingIdError: string;
  }
): Promise<DBListing> {
  requireUserId(userId, userIdError);
  requireListingId(listingId, listingIdError);
  return assertListingOwnership(userId, listingId);
}
