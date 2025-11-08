"use server";

import { db } from "@zencourt/db";
import { images } from "@zencourt/db";
import { eq, sql } from "drizzle-orm";
import type { Image, NewImage } from "../../../types/schema";
import { getUser } from "./users";
import { SerializableImageData } from "../../../types/images";

/**
 * Save processed images to database
 * Server action that saves multiple images with their classifications
 *
 * @param projectId - The project ID these images belong to
 * @param imageData - Array of serializable image data
 * @returns Promise<Image[]> - Array of saved images
 * @throws Error if user is not authenticated or save fails
 */
export async function saveImages(
  projectId: string,
  imageData: SerializableImageData[]
): Promise<Image[]> {
  await getUser();

  // Map SerializableImageData to database Image format
  const imageRecords: NewImage[] = imageData.map((img, index) => ({
    id: img.id,
    projectId,
    filename: img.filename,
    url: img.uploadUrl,
    category: img.classification?.category || null,
    confidence: img.classification?.confidence
      ? Math.round(img.classification.confidence * 100)
      : null,
    features: img.classification?.features || null,
    sceneDescription: img.sceneDescription || null,
    order: index,
    metadata: {
      width: img.metadata?.width || 0,
      height: img.metadata?.height || 0,
      format: img.metadata?.format || "",
      size: img.metadata?.size || 0,
      lastModified: img.metadata?.lastModified || 0
    }
  }));

  // Debug: Log scene descriptions being saved
  console.log(
    "[DB Actions] Saving images with scene descriptions:",
    imageRecords.map((img) => ({
      id: img.id,
      category: img.category,
      hasSceneDesc: !!img.sceneDescription,
      sceneDescLength: img.sceneDescription?.length || 0
    }))
  );

  // Upsert images into database (insert or update on conflict)
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

  return savedImages as Image[];
}

/**
 * Get all images for a project
 * Server action that retrieves all images belonging to a project
 *
 * @param projectId - The project ID to get images for
 * @returns Promise<Image[]> - Array of images
 * @throws Error if user is not authenticated
 */
export async function getProjectImages(projectId: string): Promise<Image[]> {
  await getUser();

  const projectImages = await db
    .select()
    .from(images)
    .where(eq(images.projectId, projectId));

  return projectImages as Image[];
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
  await getUser();

  await db.delete(images).where(eq(images.projectId, projectId));
}
