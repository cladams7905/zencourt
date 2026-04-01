import { updateListingForCurrentUser } from "@web/src/server/actions/listings/commands";
import { fetchPropertyDetailsForCurrentUser } from "@web/src/server/actions/listings/propertyDetails";
import { categorizeListingImagesForCurrentUser } from "@web/src/server/actions/listings/image/categorize";
import {
  cancelVideoGenerationBatch,
  startListingVideoGeneration
} from "@web/src/server/actions/video/generate";
import type { VideoGenerationBatchStatusPayload } from "@web/src/lib/domain/listings/video/videoStatus";
import {
  fetchApiData,
  fetchStreamResponse
} from "@web/src/lib/core/http/client";

export type ListingProcessingImage = {
  id: string;
  url?: string | null;
  filename?: string | null;
  category: string | null;
  confidence?: number | null;
  recommendationScore?: number | null;
  shotType?: "room" | "detail" | "other" | null;
  analysisStatus?: "pending" | "processing" | "complete" | "failed" | null;
  uploadedAt?: string | Date | null;
};

export async function updateListingStage(
  listingId: string,
  listingStage: "review" | "complete"
) {
  await updateListingForCurrentUser(listingId, { listingStage });
}

export async function fetchPropertyDetails(
  listingId: string,
  address?: string | null
) {
  await fetchPropertyDetailsForCurrentUser(listingId, address ?? null);
}

export async function fetchVideoStatus(
  batchId: string
): Promise<VideoGenerationBatchStatusPayload | null> {
  try {
    return await fetchApiData<VideoGenerationBatchStatusPayload>(
      `/api/v1/video/status/${batchId}`
    );
  } catch {
    return null;
  }
}

export async function fetchListingImages(listingId: string): Promise<
  ListingProcessingImage[]
> {
  try {
    return await fetchApiData<ListingProcessingImage[]>(
      `/api/v1/listings/${listingId}/images`
    );
  } catch {
    return [];
  }
}

export function countTerminalInBatch(
  images: ListingProcessingImage[],
  batchImageIds: string[]
) {
  const batchIdSet = new Set(batchImageIds);
  const batchImages = images.filter((image) => batchIdSet.has(image.id));
  const batchCompleted = batchImages.filter(
    (image) =>
      image.analysisStatus === "complete" || image.analysisStatus === "failed"
  ).length;
  const processingCount = batchImages.filter(
    (image) => image.analysisStatus === "processing"
  ).length;

  return {
    batchImages,
    batchTotal: batchImageIds.length,
    batchCompleted,
    processingCount,
    isComplete: batchImageIds.length > 0 && batchCompleted >= batchImageIds.length
  };
}

export async function triggerCategorization(listingId: string) {
  await categorizeListingImagesForCurrentUser(listingId);
}

export async function startListingContentGeneration(listingId: string) {
  await fetchStreamResponse(`/api/v1/listings/${listingId}/content/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subcategory: "new_listing" })
  });
}

export async function startVideoGeneration(listingId: string) {
  return await startListingVideoGeneration({ listingId });
}

export async function cancelVideoGeneration(batchId: string) {
  await cancelVideoGenerationBatch(batchId, "Canceled by user");
}
