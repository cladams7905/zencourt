"use server";

import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
import {
  db,
  collections,
  collectionImages as images
} from "@db/client";
import {
  DBCollection,
  DBImage,
  InsertDBImage
} from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";

/**
 * Create a collection for a project
 */
export async function createCollection(
  userId: string,
  projectId: string
): Promise<DBCollection> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to create a collection");
  }
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required to create a collection");
  }

  return withDbErrorHandling(
    async () => {
      const [collection] = await db
        .insert(collections)
        .values({
          id: nanoid(),
          projectId
        })
        .returning();
      return collection;
    },
    {
      actionName: "createCollection",
      context: { userId, projectId },
      errorMessage: "Failed to create collection. Please try again."
    }
  );
}

/**
 * Fetch a collection by id
 */
export async function getCollectionById(
  userId: string,
  collectionId: string
): Promise<DBCollection | null> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch collection");
  }
  if (!collectionId || collectionId.trim() === "") {
    throw new Error("Collection ID is required");
  }

  return withDbErrorHandling(
    async () => {
      const [collection] = await db
        .select()
        .from(collections)
        .where(eq(collections.id, collectionId))
        .limit(1);

      return collection ?? null;
    },
    {
      actionName: "getCollectionById",
      context: { userId, collectionId },
      errorMessage: "Failed to load collection. Please try again."
    }
  );
}

/**
 * Fetch the collection for a specific project
 */
export async function getCollectionByProjectId(
  userId: string,
  projectId: string
): Promise<DBCollection | null> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch collection");
  }
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      const [collection] = await db
        .select()
        .from(collections)
        .where(eq(collections.projectId, projectId))
        .limit(1);

      return collection ?? null;
    },
    {
      actionName: "getCollectionByProjectId",
      context: { userId, projectId },
      errorMessage: "Failed to load project collection. Please try again."
    }
  );
}

/**
 * Delete a collection
 */
export async function deleteCollection(
  userId: string,
  collectionId: string
): Promise<void> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to delete a collection");
  }
  if (!collectionId || collectionId.trim() === "") {
    throw new Error("Collection ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await db.delete(collections).where(eq(collections.id, collectionId));
    },
    {
      actionName: "deleteCollection",
      context: { userId, collectionId },
      errorMessage: "Failed to delete collection. Please try again."
    }
  );
}

/**
 * Save processed images to database
 * Server action that saves multiple images with their classifications
 *
 * @param collectionId - The collection ID these images belong to
 * @param imageData - Array of image data to insert (uses DBImage structure)
 * @returns Promise<DBImage[]> - Array of saved images
 * @throws Error if user is not authenticated or save fails
 */
export async function saveImages(
  userId: string,
  collectionId: string,
  imageData: InsertDBImage[]
): Promise<DBImage[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to save images");
  }

  if (!imageData || imageData.length === 0) {
    throw new Error("At least one image is required");
  }

  return withDbErrorHandling(
    async () => {
      const imageRecords: InsertDBImage[] = imageData.map((img, index) => ({
        ...img,
        collectionId,
        sortOrder: img.sortOrder ?? index
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
            sortOrder: sql`excluded.sort_order`,
            metadata: sql`excluded.metadata`
          }
        })
        .returning();

      return savedImages;
    },
    {
      actionName: "saveImages",
      context: { collectionId, userId, imageCount: imageData.length },
      errorMessage: "Failed to save images to database. Please try again."
    }
  );
}

/**
 * Get all images for a collection
 * Server action that retrieves all images belonging to a collection
 *
 * @param projectId - The project ID to get images for
 * @returns Promise<DBImage[]> - Array of images
 * @throws Error if user is not authenticated
 */
export async function getProjectImages(
  userId: string,
  collectionId: string
): Promise<DBImage[]> {
  if (!collectionId || collectionId.trim() === "") {
    throw new Error("Collection ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch images");
  }

  return withDbErrorHandling(
    async () => {
      const projectImages = await db
        .select()
        .from(images)
        .where(eq(images.collectionId, collectionId));
      return projectImages as DBImage[];
    },
    {
      actionName: "getProjectImages",
      context: { collectionId, userId },
      errorMessage: "Failed to fetch images from database. Please try again."
    }
  );
}

/**
 * Delete all images for a collection
 * Server action that deletes all images belonging to a collection
 *
 * @param projectId - The project ID to delete images for
 * @returns Promise<void>
 * @throws Error if user is not authenticated or deletion fails
 */
export async function deleteProjectImages(
  userId: string,
  collectionId: string
): Promise<void> {
  if (!collectionId || collectionId.trim() === "") {
    throw new Error("Collection ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to delete images");
  }

  return withDbErrorHandling(
    async () => {
      await db.delete(images).where(eq(images.collectionId, collectionId));
    },
    {
      actionName: "deleteProjectImages",
      context: { collectionId, userId },
      errorMessage: "Failed to delete images from database. Please try again."
    }
  );
}

/**
 * Delete a single image by ID
 */
export async function deleteImage(
  userId: string,
  imageId: string
): Promise<void> {
  if (!imageId || imageId.trim() === "") {
    throw new Error("Image ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to delete image");
  }

  return withDbErrorHandling(
    async () => {
      await db.delete(images).where(eq(images.id, imageId));
    },
    {
      actionName: "deleteImage",
      context: { imageId, userId },
      errorMessage: "Failed to delete image. Please try again."
    }
  );
}
