/**
 * Re-exports from imageCategorization service for backwards compatibility.
 * New code should import from @web/src/server/services/imageCategorization.
 */

import { getListingById } from "@web/src/server/actions/db/listings";
import {
  loadListingImagesForWorkflow,
  toSerializableImageData,
  persistListingImageAnalysis
} from "@web/src/server/services/imageCategorization";

export async function assertListingExists(
  userId: string,
  listingId: string
): Promise<void> {
  const listing = await getListingById(userId, listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }
}

export const loadListingImages = loadListingImagesForWorkflow;
export { toSerializableImageData, persistListingImageAnalysis };
