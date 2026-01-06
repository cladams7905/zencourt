"use server";

import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
import { db, campaignImages as images } from "@db/client";
import {
  DBCampaignImage,
  InsertDBCampaignImage
} from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";

/**
 * Save processed images to database for a campaign
 */
export async function saveImages(
  userId: string,
  campaignId: string,
  imageData: InsertDBCampaignImage[]
): Promise<DBCampaignImage[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to save images");
  }

  if (!imageData || imageData.length === 0) {
    throw new Error("At least one image is required");
  }

  return withDbErrorHandling(
    async () => {
      const imageRecords: InsertDBCampaignImage[] = imageData.map(
        (img, index) => ({
          ...img,
          id: img.id ?? nanoid(),
          campaignId,
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
      context: { campaignId, userId, imageCount: imageData.length },
      errorMessage: "Failed to save images to database. Please try again."
    }
  );
}

/**
 * Get all images for a campaign
 */
export async function getCampaignImages(
  userId: string,
  campaignId: string
): Promise<DBCampaignImage[]> {
  if (!campaignId || campaignId.trim() === "") {
    throw new Error("Campaign ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch images");
  }

  return withDbErrorHandling(
    async () => {
      const campaignImages = await db
        .select()
        .from(images)
        .where(eq(images.campaignId, campaignId));
      return campaignImages as DBCampaignImage[];
    },
    {
      actionName: "getCampaignImages",
      context: { campaignId, userId },
      errorMessage: "Failed to fetch images from database. Please try again."
    }
  );
}

/**
 * Delete all images for a campaign
 */
export async function deleteCampaignImages(
  userId: string,
  campaignId: string
): Promise<void> {
  if (!campaignId || campaignId.trim() === "") {
    throw new Error("Campaign ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to delete images");
  }

  return withDbErrorHandling(
    async () => {
      await db.delete(images).where(eq(images.campaignId, campaignId));
    },
    {
      actionName: "deleteCampaignImages",
      context: { campaignId, userId },
      errorMessage: "Failed to delete images from database. Please try again."
    }
  );
}
