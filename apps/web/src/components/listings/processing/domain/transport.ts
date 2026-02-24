import { updateListingForCurrentUser } from "@web/src/server/actions/listings/commands";
import { fetchPropertyDetailsForCurrentUser } from "@web/src/server/actions/propertyDetails/commands";
import { categorizeListingImagesForCurrentUser } from "@web/src/server/actions/imageCategorization";
import {
  cancelListingVideoGeneration,
  startListingVideoGeneration
} from "@web/src/server/actions/video";
import type { VideoJobUpdateEvent } from "@web/src/lib/domain/listing/videoStatus";
import { fetchApiData, fetchStreamResponse } from "@web/src/lib/core/http/client";

export async function updateListingStage(
  listingId: string,
  listingStage: "review" | "create"
) {
  await updateListingForCurrentUser(listingId, { listingStage });
}

export async function fetchPropertyDetails(
  listingId: string,
  address?: string | null
) {
  await fetchPropertyDetailsForCurrentUser(listingId, address ?? null);
}

export async function fetchVideoStatus(listingId: string): Promise<{
  jobs: VideoJobUpdateEvent[];
}> {
  try {
    const data = await fetchApiData<{ jobs?: VideoJobUpdateEvent[] }>(
      `/api/v1/video/status/${listingId}`
    );
    return { jobs: data?.jobs ?? [] };
  } catch {
    return { jobs: [] };
  }
}

export async function fetchListingImages(listingId: string): Promise<
  Array<{
    category: string | null;
    confidence?: number | null;
    primaryScore?: number | null;
    uploadedAt?: string | Date | null;
  }>
> {
  try {
    return await fetchApiData<
      Array<{
        category: string | null;
        confidence?: number | null;
        primaryScore?: number | null;
        uploadedAt?: string | Date | null;
      }>
    >(`/api/v1/listings/${listingId}/images`);
  } catch {
    return [];
  }
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
  await startListingVideoGeneration({ listingId });
}

export async function cancelVideoGeneration(listingId: string) {
  await cancelListingVideoGeneration(listingId, "Canceled by user");
}
