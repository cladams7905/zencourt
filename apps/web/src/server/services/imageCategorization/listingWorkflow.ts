/**
 * Listing images categorization workflow: load images, run AI analysis,
 * persist results, assign primary images by category.
 * Uses the shared analyzeImagesWorkflow from service (same pattern as other services).
 */

import { and, db, eq, inArray, listingImages } from "@db/client";
import type { SerializableImageData } from "@web/src/lib/domain/listing/images";
import { getListingById } from "@web/src/server/models/listings";
import { assignPrimaryListingImageForCategory } from "@web/src/server/models/listingImages";
import { analyzeImagesWorkflow } from "./service";
import type { CategorizationResult } from "./types";

export type ListingImagesCategorizationOptions = {
  aiConcurrency?: number;
};

type ListingImageRow = typeof listingImages.$inferSelect;

export async function loadListingImagesForWorkflow(
  listingId: string,
  imageIds?: string[]
): Promise<ListingImageRow[]> {
  if (imageIds && imageIds.length > 0) {
    return db
      .select()
      .from(listingImages)
      .where(
        and(
          eq(listingImages.listingId, listingId),
          inArray(listingImages.id, imageIds)
        )
      );
  }
  return db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId));
}

export function toSerializableImageData(
  image: ListingImageRow
): SerializableImageData {
  return {
    id: image.id,
    listingId: image.listingId,
    url: image.url,
    filename: image.filename,
    category: image.category ?? null,
    confidence: image.confidence ?? null,
    primaryScore: image.primaryScore ?? null,
    status: "uploaded",
    isPrimary: image.isPrimary ?? false,
    metadata: image.metadata ?? null,
    error: undefined,
    uploadUrl: undefined
  };
}

export async function persistListingImageAnalysis(
  listingId: string,
  image: SerializableImageData
): Promise<void> {
  await db
    .update(listingImages)
    .set({
      category: image.category ?? null,
      confidence: image.confidence ?? null,
      primaryScore: image.primaryScore ?? null,
      metadata: image.metadata ?? undefined
    })
    .where(
      and(
        eq(listingImages.id, image.id),
        eq(listingImages.listingId, listingId)
      )
    );
}

async function assignPrimaryImagesByCategory(
  userId: string,
  listingId: string,
  categories: string[]
): Promise<void> {
  const uniqueCategories = Array.from(
    new Set(categories.filter((c) => c.trim() !== ""))
  );
  if (uniqueCategories.length === 0) return;
  await Promise.all(
    uniqueCategories.map((category) =>
      assignPrimaryListingImageForCategory(userId, listingId, category)
    )
  );
}

function buildNoopStats(uploaded: number, analyzed: number): CategorizationResult["stats"] {
  return {
    total: 0,
    uploaded,
    analyzed,
    failed: 0,
    successRate: 100,
    avgConfidence: 0,
    totalDuration: 0
  };
}

/**
 * Run the full listing images categorization workflow: assert listing,
 * load images, analyze via analyzeImagesWorkflow, persist, assign primaries.
 */
export async function runListingImagesCategorizationWorkflow(
  userId: string,
  listingId: string,
  options: ListingImagesCategorizationOptions = {},
  imageIds?: string[]
): Promise<CategorizationResult["stats"]> {
  const listing = await getListingById(userId, listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  const images = await loadListingImagesForWorkflow(listingId, imageIds);
  const needsAnalysis = images.filter((img) => !img.category);

  if (needsAnalysis.length === 0) {
    return buildNoopStats(images.length, images.length);
  }

  const serializableImages = needsAnalysis.map(toSerializableImageData);
  const result = await analyzeImagesWorkflow(serializableImages, {
    aiConcurrency: options.aiConcurrency,
    onProgress: (progress) => {
      if (progress.currentImage) {
        void persistListingImageAnalysis(listingId, progress.currentImage);
      }
    }
  });

  await Promise.all(
    result.images.map((image) =>
      persistListingImageAnalysis(listingId, image)
    )
  );

  await assignPrimaryImagesByCategory(
    userId,
    listingId,
    result.images
      .map((image) => image.category ?? "")
      .filter((category) => category !== "")
  );

  return result.stats;
}
