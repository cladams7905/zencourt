import { sanitizeFilename } from "./sanitize";

/**
 * Get the folder path for a listing's images.
 * Format: user_{userId}/listings/listing_{listingId}
 */
export function getListingFolder(
  listingId: string,
  userId: string
): string {
  if (!userId) {
    throw new Error(
      "User ID is required for listing folder. Cannot upload without authentication."
    );
  }
  return `user_${userId}/listings/listing_${listingId}`;
}

/**
 * Get the full storage key/path for a listing image.
 * Format: user_{userId}/listings/listing_{listingId}/images/{filename}
 */
export function getListingImagePath(
  userId: string,
  listingId: string,
  filename: string
): string {
  const sanitized = sanitizeFilename(filename);
  return `${getListingFolder(listingId, userId)}/images/${sanitized}`;
}
