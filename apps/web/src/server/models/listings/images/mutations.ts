"use server";

import { nanoid } from "nanoid";
import {
  and,
  db,
  eq,
  inArray,
  listingImages,
  ne
} from "@db/client";
import type { DBListingImage } from "@db/types/models";
import { getListingFolder } from "@shared/utils/storagePaths";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { ensureListingImageAccess } from "./helpers";
import type { ListingImageRecordInput, ListingImageUpdate } from "./types";

type PrimarySelectionRow = {
  id: string;
  primaryScore: number | null;
  uploadedAt: Date;
  isPrimary: boolean | null;
};

type PrimaryCandidate = {
  id: string;
  score: number;
  uploadedAt: Date;
};

function toPrimaryCandidate(row: PrimarySelectionRow): PrimaryCandidate {
  return {
    id: row.id,
    score: typeof row.primaryScore === "number" ? row.primaryScore : -Infinity,
    uploadedAt: row.uploadedAt
  };
}

function chooseBestCandidate(
  current: PrimaryCandidate | null,
  candidate: PrimaryCandidate
): PrimaryCandidate {
  if (!current) {
    return candidate;
  }
  if (candidate.score > current.score) {
    return candidate;
  }
  if (candidate.score < current.score) {
    return current;
  }
  if (candidate.uploadedAt < current.uploadedAt) {
    return candidate;
  }
  if (
    candidate.uploadedAt.getTime() === current.uploadedAt.getTime() &&
    candidate.id < current.id
  ) {
    return candidate;
  }
  return current;
}

function selectPrimaryCandidate(rows: PrimarySelectionRow[]): {
  best: PrimaryCandidate | null;
  currentPrimary: PrimaryCandidate | null;
} {
  let best: PrimaryCandidate | null = null;
  let currentPrimary: PrimaryCandidate | null = null;

  for (const row of rows) {
    const candidate = toPrimaryCandidate(row);
    if (row.isPrimary && !currentPrimary) {
      currentPrimary = candidate;
    }
    best = chooseBestCandidate(best, candidate);
  }

  return { best, currentPrimary };
}

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
  const nextIsPrimary = update.category === null ? false : update.isPrimary;

  if (nextIsPrimary && update.category) {
    await db
      .update(listingImages)
      .set({ isPrimary: false })
      .where(
        and(
          eq(listingImages.listingId, listingId),
          eq(listingImages.category, update.category),
          ne(listingImages.id, update.id)
        )
      );
  }

  await db
    .update(listingImages)
    .set({
      category: update.category,
      ...(update.isPrimary !== undefined
        ? { isPrimary: nextIsPrimary ?? false }
        : {})
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

export async function assignPrimaryListingImageForCategory(
  userId: string,
  listingId: string,
  category: string
): Promise<{ primaryImageId: string | null }> {
  if (!category || category.trim() === "") {
    return { primaryImageId: null };
  }

  return withDbErrorHandling(
    async () => {
      await ensureListingImageAccess(userId, listingId, {
        userIdError: "User ID is required to update listing images",
        listingIdError: "Listing ID is required to update listing images"
      });
      return assignPrimaryListingImageForCategoryTrusted(listingId, category);
    },
    {
      actionName: "assignPrimaryListingImageForCategory",
      context: { userId, listingId, category },
      errorMessage: "Failed to update primary image. Please try again."
    }
  );
}

export async function assignPrimaryListingImageForCategoryTrusted(
  listingId: string,
  category: string
): Promise<{ primaryImageId: string | null }> {
  const rows = await db
    .select({
      id: listingImages.id,
      primaryScore: listingImages.primaryScore,
      uploadedAt: listingImages.uploadedAt,
      isPrimary: listingImages.isPrimary
    })
    .from(listingImages)
    .where(
      and(
        eq(listingImages.listingId, listingId),
        eq(listingImages.category, category)
      )
    );

  const { best, currentPrimary } = selectPrimaryCandidate(rows);

  if (currentPrimary && best && best.score <= currentPrimary.score) {
    return { primaryImageId: currentPrimary.id };
  }

  await db
    .update(listingImages)
    .set({ isPrimary: false })
    .where(
      and(
        eq(listingImages.listingId, listingId),
        eq(listingImages.category, category)
      )
    );

  if (best) {
    await db
      .update(listingImages)
      .set({ isPrimary: true })
      .where(
        and(
          eq(listingImages.listingId, listingId),
          eq(listingImages.category, category),
          eq(listingImages.id, best.id)
        )
      );
  }

  return { primaryImageId: best?.id ?? null };
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
      const rows = uploads.map((upload) => {
        if (!upload.key.startsWith(prefix)) {
          throw new Error("Invalid listing image upload key");
        }

        return {
          id: nanoid(),
          listingId,
          filename: upload.fileName,
          url: upload.publicUrl,
          isPrimary: false,
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
