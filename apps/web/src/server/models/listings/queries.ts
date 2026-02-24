"use server";

import { and, db, eq, like, listings } from "@db/client";
import type { DBListing } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { requireListingId, requireUserId } from "@web/src/server/models/shared/validation";

export async function getListingById(
  userId: string,
  listingId: string
): Promise<DBListing | null> {
  requireUserId(userId, "User ID is required to fetch a listing");
  requireListingId(listingId, "Listing ID is required to fetch a listing");

  return withDbErrorHandling(
    async () => {
      const [listing] = await db
        .select()
        .from(listings)
        .where(and(eq(listings.id, listingId), eq(listings.userId, userId)))
        .limit(1);

      return (listing as DBListing) ?? null;
    },
    {
      actionName: "getListingById",
      context: { userId, listingId },
      errorMessage: "Failed to fetch listing. Please try again."
    }
  );
}

export async function getNextDraftNumber(userId: string): Promise<number> {
  requireUserId(userId, "User ID is required to fetch draft numbers");

  return withDbErrorHandling(
    async () => {
      const draftListings = await db
        .select()
        .from(listings)
        .where(
          and(eq(listings.userId, userId), like(listings.title, "Draft %"))
        );

      const draftNumbers = draftListings
        .map((listing) => {
          const match = listing.title?.match(/^Draft (\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => !Number.isNaN(num));

      const maxDraftNumber =
        draftNumbers.length > 0 ? Math.max(...draftNumbers) : 0;

      return maxDraftNumber + 1;
    },
    {
      actionName: "getNextDraftNumber",
      errorMessage: "Failed to get draft number. Please try again."
    }
  );
}
