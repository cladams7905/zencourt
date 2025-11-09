"use server";

import { eq, sql } from "drizzle-orm";
import { db, images } from "@db/client";
import { DBImage, InsertDBImage } from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";
import { getUser } from "./users";

/**
 * Save processed images to database
 * Server action that saves multiple images with their classifications
 *
 * @param projectId - The project ID these images belong to
 * @param imageData - Array of image data to insert (uses DBImage structure)
 * @returns Promise<DBImage[]> - Array of saved images
 * @throws Error if user is not authenticated or save fails
 */
export async function saveImages(
  projectId: string,
  imageData: InsertDBImage[]
): Promise<DBImage[]> {
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required");
  }

  if (!imageData || imageData.length === 0) {
    throw new Error("At least one image is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const imageRecords: InsertDBImage[] = imageData.map((img, index) => ({
        ...img,
        projectId,
        order: img.order ?? index
      }));

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
            order: sql`excluded.order`,
            metadata: sql`excluded.metadata`
          }
        })
        .returning();

      return savedImages;
    },
    {
      actionName: "saveImages",
      context: { projectId, imageCount: imageData.length },
      errorMessage: "Failed to save images to database. Please try again."
    }
  );
}

/**
 * Get all images for a project
 * Server action that retrieves all images belonging to a project
 *
 * @param projectId - The project ID to get images for
 * @returns Promise<DBImage[]> - Array of images
 * @throws Error if user is not authenticated
 */
export async function getProjectImages(projectId: string): Promise<DBImage[]> {
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const projectImages = await db
        .select()
        .from(images)
        .where(eq(images.projectId, projectId));
      return projectImages as DBImage[];
    },
    {
      actionName: "getProjectImages",
      context: { projectId },
      errorMessage: "Failed to fetch images from database. Please try again."
    }
  );
}

/**
 * Delete all images for a project
 * Server action that deletes all images belonging to a project
 *
 * @param projectId - The project ID to delete images for
 * @returns Promise<void>
 * @throws Error if user is not authenticated or deletion fails
 */
export async function deleteProjectImages(projectId: string): Promise<void> {
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();
      await db.delete(images).where(eq(images.projectId, projectId));
    },
    {
      actionName: "deleteProjectImages",
      context: { projectId },
      errorMessage: "Failed to delete images from database. Please try again."
    }
  );
}
