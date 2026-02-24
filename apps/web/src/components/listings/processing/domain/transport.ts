import { updateListingForCurrentUser } from "@web/src/server/actions/listings/commands";
import { fetchPropertyDetailsForCurrentUser } from "@web/src/server/actions/propertyDetails/commands";
import { categorizeListingImagesForCurrentUser } from "@web/src/server/actions/imageCategorization";
import {
  cancelListingVideoGeneration,
  startListingVideoGeneration
} from "@web/src/server/actions/video";
import type { VideoJobUpdateEvent } from "@web/src/lib/domain/listing/videoStatus";

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
  const response = await fetch(`/api/v1/video/status/${listingId}`);
  if (!response.ok) {
    return { jobs: [] };
  }
  const payload = (await response.json()) as {
    success: boolean;
    data?: { jobs?: VideoJobUpdateEvent[] };
  };

  return {
    jobs: payload?.success ? payload.data?.jobs ?? [] : []
  };
}

export async function fetchListingImages(listingId: string): Promise<
  Array<{
    category: string | null;
    confidence?: number | null;
    primaryScore?: number | null;
    uploadedAt?: string | Date | null;
  }>
> {
  const response = await fetch(`/api/v1/listings/${listingId}/images`);
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as {
    success: boolean;
    data?: Array<{
      category: string | null;
      confidence?: number | null;
      primaryScore?: number | null;
      uploadedAt?: string | Date | null;
    }>;
  };
  return payload.data ?? [];
}

export async function triggerCategorization(listingId: string) {
  await categorizeListingImagesForCurrentUser(listingId);
}

export async function startListingContentGeneration(listingId: string) {
  const response = await fetch(`/api/v1/listings/${listingId}/content/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subcategory: "new_listing" })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.message || payload?.error || "Failed to generate listing content."
    );
  }
}

export async function startVideoGeneration(listingId: string) {
  await startListingVideoGeneration({ listingId });
}

export async function cancelVideoGeneration(listingId: string) {
  await cancelListingVideoGeneration(listingId, "Canceled by user");
}
