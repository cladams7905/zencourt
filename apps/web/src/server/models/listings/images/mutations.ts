"use server";

import { nanoid } from "nanoid";
import { and, db, eq, inArray, listingImages } from "@db/client";
import type { DBListingImage } from "@db/types/models";
import { getListingFolder } from "@shared/utils/storagePaths";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { ensureListingImageAccess } from "./helpers";
import type { ListingImageRecordInput, ListingImageUpdate } from "./types";

async function deleteListingImageRows(
  listingId: string,
  deletions: string[]
): Promise<void> {
  await db
    .delete(listingImages)
    .where(
      and(
        eq(listingImages.listingId, listingId),
        inArray(listingImages.id, deletions)
      )
    );
}

async function applyListingImageUpdate(
  listingId: string,
  update: ListingImageUpdate
): Promise<void> {
  await db
    .update(listingImages)
    .set({
      category: update.category
    })
    .where(
      and(
        eq(listingImages.listingId, listingId),
        eq(listingImages.id, update.id)
      )
    );
}

export async function updateListingImageAssignments(
  userId: string,
  listingId: string,
  updates: ListingImageUpdate[],
  deletions: string[]
): Promise<{ updated: number; deleted: number }> {
  return withDbErrorHandling(
    async () => {
      await ensureListingImageAccess(userId, listingId, {
        userIdError: "User ID is required to update listing images",
        listingIdError: "Listing ID is required to update listing images"
      });

      if (deletions.length > 0) {
        await deleteListingImageRows(listingId, deletions);
      }

      for (const update of updates) {
        await applyListingImageUpdate(listingId, update);
      }

      return { updated: updates.length, deleted: deletions.length };
    },
    {
      actionName: "updateListingImageAssignments",
      context: { userId, listingId },
      errorMessage: "Failed to update listing images. Please try again."
    }
  );
}

export async function createListingImageRecords(
  userId: string,
  listingId: string,
  uploads: ListingImageRecordInput[]
): Promise<DBListingImage[]> {
  if (!uploads || uploads.length === 0) {
    return [];
  }

  return withDbErrorHandling(
    async () => {
      await ensureListingImageAccess(userId, listingId, {
        userIdError: "User ID is required to save listing images",
        listingIdError: "Listing ID is required to save listing images"
      });

      const prefix = `${getListingFolder(listingId, userId)}/images/`;
      const rows: typeof listingImages.$inferInsert[] = uploads.map((upload) => {
        if (!upload.key.startsWith(prefix)) {
          throw new Error("Invalid listing image upload key");
        }

        return {
          id: nanoid(),
          listingId,
          filename: upload.fileName,
          url: upload.publicUrl,
          shotType: "room" as const,
          analysisStatus: "pending" as const,
          metadata: upload.metadata ?? null
        };
      });

      const inserted = await db.insert(listingImages).values(rows).returning();
      return inserted as DBListingImage[];
    },
    {
      actionName: "createListingImageRecords",
      context: { userId, listingId, uploadCount: uploads.length },
      errorMessage: "Failed to save listing images. Please try again."
    }
  );
}
