"use server";

import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
import { db, listingImages as images } from "@db/client";
import {
  DBListingImage,
  InsertDBListingImage
} from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";

/**
 * Save processed images to database for a listing
 */
export async function saveImages(
  userId: string,
  listingId: string,
  imageData: InsertDBListingImage[]
): Promise<DBListingImage[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to save images");
  }

  if (!imageData || imageData.length === 0) {
    throw new Error("At least one image is required");
  }

  return withDbErrorHandling(
    async () => {
      const imageRecords: InsertDBListingImage[] = imageData.map(
        (img, index) => ({
          ...img,
          id: img.id ?? nanoid(),
          listingId,
          sortOrder: img.sortOrder ?? index
        })
      );

      const savedImages = await db
        .insert(images)
        .values(imageRecords)
        .onConflictDoUpdate({
          target: images.id,
          set: {
            category: sql`excluded.category`,
            confidence: sql`excluded.confidence`,
            features: sql`excluded.features`,
            sceneDescription: sql`excluded.scene_description`,
            sortOrder: sql`excluded.sort_order`,
            metadata: sql`excluded.metadata`
          }
        })
        .returning();

      return savedImages;
    },
    {
      actionName: "saveImages",
      context: { listingId, userId, imageCount: imageData.length },
      errorMessage: "Failed to save images to database. Please try again."
    }
  );
}

/**
 * Get all images for a listing
 */
export async function getListingImages(
  userId: string,
  listingId: string
): Promise<DBListingImage[]> {
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch images");
  }

  return withDbErrorHandling(
    async () => {
      const listingImages = await db
        .select()
        .from(images)
        .where(eq(images.listingId, listingId));
      return listingImages as DBListingImage[];
    },
    {
      actionName: "getListingImages",
      context: { listingId, userId },
      errorMessage: "Failed to fetch images from database. Please try again."
    }
  );
}

/**
 * Delete all images for a listing
 */
export async function deleteListingImages(
  userId: string,
  listingId: string
): Promise<void> {
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to delete images");
  }

  return withDbErrorHandling(
    async () => {
      await db.delete(images).where(eq(images.listingId, listingId));
    },
    {
      actionName: "deleteListingImages",
      context: { listingId, userId },
      errorMessage: "Failed to delete images from database. Please try again."
    }
  );
}
