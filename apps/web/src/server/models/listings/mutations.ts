"use server";

import { nanoid } from "nanoid";
import { and, db, eq, listings } from "@db/client";
import type { DBListing } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { requireListingId, requireUserId } from "@web/src/server/models/shared/validation";
import type { UpdateListingInput } from "./types";
import { getListingById, getNextDraftNumber } from "./queries";

async function createListingRecord(userId: string): Promise<DBListing> {
  requireUserId(userId, "User ID is required to create a listing");

  return withDbErrorHandling(
    async () => {
      return db.transaction(async (tx) => {
        const listingId = nanoid();
        const [newListing] = await tx
          .insert(listings)
          .values({
            id: listingId,
            userId
          })
          .returning();

        return {
          ...newListing,
          primaryContentId: null,
          thumbnailUrl: null,
          contents: []
        };
      });
    },
    {
      actionName: "createListing",
      errorMessage: "Failed to create listing. Please try again."
    }
  );
}

export async function createListing(userId: string): Promise<DBListing> {
  requireUserId(userId, "User ID is required to create a draft listing");

  return withDbErrorHandling(
    async () => {
      const listing = await createListingRecord(userId);
      const draftNumber = await getNextDraftNumber(userId);
      const title = `Draft ${draftNumber}`;

      await updateListing(userId, listing.id, { title });
      const confirmed = await getListingById(userId, listing.id);

      if (!confirmed) {
        throw new Error("Draft listing could not be saved.");
      }

      return {
        ...confirmed,
        title
      };
    },
    {
      actionName: "createListing",
      context: { userId },
      errorMessage: "Failed to create draft listing. Please try again."
    }
  );
}

export async function updateListing(
  userId: string,
  listingId: string,
  updates: UpdateListingInput
): Promise<DBListing> {
  requireListingId(listingId, "Listing ID is required");
  requireUserId(userId, "User ID is required to update a listing");

  return withDbErrorHandling(
    async () => {
      const [updatedListing] = await db
        .update(listings)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(eq(listings.id, listingId), eq(listings.userId, userId)))
        .returning();

      if (!updatedListing) {
        throw new Error("Listing not found");
      }

      return updatedListing;
    },
    {
      actionName: "updateListing",
      context: { listingId },
      errorMessage: "Failed to update listing. Please try again."
    }
  );
}
