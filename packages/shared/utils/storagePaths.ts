/**
 * Centralized Storage Path Generation
 *
 * Single source of truth for storage path/key generation across both
 * Vercel and Express server to ensure consistent file organization.
 *
 * Standard format: user_{userId}/listings/listing_{listingId}/...
 */

import { nanoid } from "nanoid";

/**
 * Storage-safe segment sanitizer for identifiers (user/project/video IDs, folders, etc.)
 * Keeps casing intact while removing unsupported characters for storage keys.
 */
function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Sanitize filename for storage
 * Removes special characters and ensures safe file names
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Get the folder path for a listing's images
 * Format: user_{userId}/listings/listing_{listingId}
 *
 * @param listingId - Listing ID
 * @param userId - User ID (required for user-scoped folders)
 * @throws Error if userId is not provided
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
 * Get the full storage key/path for a listing image
 * Format: user_{userId}/listings/listing_{listingId}/images/{filename}
 *
 * @param userId - User ID
 * @param listingId - Listing ID
 * @param filename - Original filename
 * @returns Full storage key
 */
export function getListingImagePath(
  userId: string,
  listingId: string,
  filename: string
): string {
  const sanitized = sanitizeFilename(filename);
  return `${getListingFolder(listingId, userId)}/images/${sanitized}`;
}

/**
 * Get the folder path for room videos
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}
 */
export function getRoomVideoFolder(
  userId: string,
  listingId: string,
  videoId: string
): string {
  if (!userId || !listingId || !videoId) {
    throw new Error(
      "User ID, Listing ID, and Video ID are required for video storage"
    );
  }
  return `user_${userId}/listings/listing_${listingId}/videos/video_${videoId}`;
}

/**
 * Get the folder path for a specific video job
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}/jobs/job_{jobId}
 */
export function getVideoJobFolder(
  userId: string,
  listingId: string,
  videoId: string,
  jobId: string
): string {
  if (!userId || !listingId || !videoId || !jobId) {
    throw new Error(
      "User ID, Listing ID, Video ID, and Job ID are required for job storage"
    );
  }
  return `${getRoomVideoFolder(userId, listingId, videoId)}/jobs/job_${jobId}`;
}

/**
 * Get the storage key for a video job output
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}/jobs/job_{jobId}/video.mp4
 */
export function getVideoJobVideoPath(
  userId: string,
  listingId: string,
  videoId: string,
  jobId: string
): string {
  return `${getVideoJobFolder(userId, listingId, videoId, jobId)}/video.mp4`;
}

/**
 * Get the storage key for a video job thumbnail
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}/jobs/job_{jobId}/thumbnail.jpg
 */
export function getVideoJobThumbnailPath(
  userId: string,
  listingId: string,
  videoId: string,
  jobId: string
): string {
  return `${getVideoJobFolder(userId, listingId, videoId, jobId)}/thumbnail.jpg`;
}

/**
 * Get the full storage key/path for a room video
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}/room_{roomName}_{timestamp}.mp4
 */
export function getRoomVideoPath(
  userId: string,
  listingId: string,
  videoId: string,
  roomName: string
): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(roomName);
  return `${getRoomVideoFolder(userId, listingId, videoId)}/room_${sanitized}_${timestamp}.mp4`;
}

/**
 * Get the folder path for final composed video
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}
 */
export function getFinalVideoFolder(
  userId: string,
  listingId: string,
  videoId: string
): string {
  if (!userId || !listingId || !videoId) {
    throw new Error(
      "User ID, Listing ID, and Video ID are required for video storage"
    );
  }
  return `user_${userId}/listings/listing_${listingId}/videos/video_${videoId}`;
}

/**
 * Get the full storage key/path for final video
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}/final_{timestamp}.mp4
 */
export function getFinalVideoPath(
  userId: string,
  listingId: string,
  videoId: string,
  listingName?: string
): string {
  const timestamp = Date.now();
  const filename = listingName
    ? `final_${sanitizeFilename(listingName)}_${timestamp}.mp4`
    : `final_${timestamp}.mp4`;
  return `${getFinalVideoFolder(userId, listingId, videoId)}/${filename}`;
}

/**
 * Get the full storage key/path for video thumbnail
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}/thumb_{timestamp}.jpg
 */
export function getThumbnailPath(
  userId: string,
  listingId: string,
  videoId: string
): string {
  const timestamp = Date.now();
  return `${getFinalVideoFolder(userId, listingId, videoId)}/thumb_${timestamp}.jpg`;
}

/**
 * Get the folder path for temporary video files during composition
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}/temp
 */
export function getTempVideoFolder(
  userId: string,
  listingId: string,
  videoId: string
): string {
  if (!userId || !listingId || !videoId) {
    throw new Error(
      "User ID, Listing ID, and Video ID are required for temp storage"
    );
  }
  return `user_${userId}/listings/listing_${listingId}/videos/video_${videoId}/temp`;
}

/**
 * Generate a generic upload path with timestamp and random ID
 * Used for uploads without specific user/project context
 * Format: {folder}/{timestamp}-{random}/{filename}
 *
 * @param folder - Base folder (default: "uploads")
 * @param filename - Original filename
 * @returns Full storage key
 */
export function getGenericUploadPath(folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = nanoid(8);
  const sanitized = sanitizeFilename(filename);
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "_");
  return `${sanitizedFolder}/${timestamp}-${random}/${sanitized}`;
}

/**
 * Get the folder path for user media uploads
 * Format: user_{userId}/media/{images|videos}
 */
export function getUserMediaFolder(
  userId: string,
  type: "image" | "video"
): string {
  if (!userId) {
    throw new Error("User ID is required for user media storage");
  }

  const safeUserId = sanitizePathSegment(userId);
  const folder = type === "video" ? "videos" : "images";
  return `user_${safeUserId}/media/${folder}`;
}

/**
 * Get the folder path for user media thumbnails
 * Format: user_{userId}/media/thumbnails
 */
export function getUserMediaThumbnailFolder(userId: string): string {
  if (!userId) {
    throw new Error("User ID is required for user media thumbnails");
  }

  const safeUserId = sanitizePathSegment(userId);
  return `user_${safeUserId}/media/thumbnails`;
}

/**
 * Get the full storage key/path for user media
 * Format: user_{userId}/media/{images|videos}/{filename}
 */
export function getUserMediaPath(
  userId: string,
  type: "image" | "video",
  filename: string
): string {
  const sanitized = sanitizeFilename(filename);
  const extensionIndex = sanitized.lastIndexOf(".");
  const base =
    extensionIndex > 0 ? sanitized.slice(0, extensionIndex) : sanitized;
  const extension = extensionIndex > 0 ? sanitized.slice(extensionIndex) : "";
  const uniqueName = `${base}-${Date.now()}-${nanoid(6)}${extension}`;

  return `${getUserMediaFolder(userId, type)}/${uniqueName}`;
}

/**
 * Get the full storage key/path for user media thumbnails
 * Format: user_{userId}/media/thumbnails/{filename}
 */
export function getUserMediaThumbnailPath(
  userId: string,
  filename: string
): string {
  const sanitized = sanitizeFilename(filename);
  const extensionIndex = sanitized.lastIndexOf(".");
  const base =
    extensionIndex > 0 ? sanitized.slice(0, extensionIndex) : sanitized;
  const uniqueName = `${base}-thumb-${Date.now()}-${nanoid(6)}.jpg`;

  return `${getUserMediaThumbnailFolder(userId)}/${uniqueName}`;
}

/**
 * Build the user/listing-scoped storage key that mirrors the structure shared by
 * both the Vercel app and the video server so assets stay co-located.
 */
export function buildUserListingVideoKey(
  userId: string,
  listingId: string,
  filename: string,
  videoId?: string
): string {
  const safeUserId = sanitizePathSegment(userId);
  const safeListingId = sanitizePathSegment(listingId);
  const safeFilename = sanitizePathSegment(filename);
  const videoSegment = videoId
    ? `/videos/video_${sanitizePathSegment(videoId)}`
    : "";

  return `user_${safeUserId}/listings/listing_${safeListingId}${videoSegment}/${safeFilename}`;
}

/**
 * Generic fallback path used when user/project context is unavailable.
 */
export function buildGenericUploadKey(folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const safeFolder = sanitizePathSegment(folder);
  const safeFilename = sanitizePathSegment(filename);

  return `${safeFolder}/${timestamp}-${random}/${safeFilename}`;
}

/**
 * Extract storage key from URL
 * Handles both formats:
 * - https://bucket.s3.region.amazonaws.com/key
 * - s3://bucket/key
 *
 * @param url - Storage URL
 * @returns Object key
 */
export function extractStorageKeyFromUrl(url: string): string {
  // Handle s3:// URLs
  if (url.startsWith("s3://")) {
    const parts = url.replace("s3://", "").split("/");
    parts.shift(); // Remove bucket name
    return parts.join("/");
  }

  // Handle HTTPS URLs
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname.replace(/^\/+/, "");
    const host = urlObj.hostname.toLowerCase();

    // Path-style endpoints (e.g., s3.us-west-002.backblazeb2.com/bucket/key)
    if (
      (host.startsWith("s3.") || host.startsWith("s3-")) &&
      pathname.includes("/")
    ) {
      const firstSlash = pathname.indexOf("/");
      return pathname.substring(firstSlash + 1);
    }

    return pathname;
  } catch {
    throw new Error(`Invalid storage URL format: ${url}`);
  }
}

/**
 * Build a public object URL for a storage key.
 */
export function buildStoragePublicUrl(
  endpoint: string,
  bucket: string,
  key: string
): string {
  const normalizedEndpoint = endpoint.replace(/\/+$/, "");
  const normalizedKey = key.replace(/^\/+/, "");
  const encodedKey = normalizedKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedEndpoint}/${bucket}/${encodedKey}`;
}

/**
 * Generate a temporary listing ID
 */
export function generateTempListingId(): string {
  return `temp-${Date.now()}`;
}

// Backwards-compatible exports to reduce breakage while code is migrated.
export const getProjectFolder = getListingFolder;
export const getProjectImagePath = getListingImagePath;
export const buildUserProjectVideoKey = buildUserListingVideoKey;

/**
 * Extract host from a storage endpoint URL
 */
export function getStorageEndpointHost(
  endpoint?: string | null
): string | null {
  if (!endpoint) {
    return null;
  }

  try {
    return new URL(endpoint).host;
  } catch {
    return null;
  }
}

/**
 * Determine whether a URL points to the configured storage endpoint
 */
export function isUrlFromStorageEndpoint(
  url: string,
  endpoint?: string | null
): boolean {
  if (!url) {
    return false;
  }

  if (url.startsWith("s3://")) {
    return true;
  }

  const endpointHost = getStorageEndpointHost(endpoint);
  if (!endpointHost) {
    return false;
  }

  try {
    const urlHost = new URL(url).host;
    if (urlHost === endpointHost) {
      return true;
    }
    // Handle bucket-style subdomains (e.g., bucket.s3.us-east-005.backblazeb2.com)
    return urlHost.endsWith(`.${endpointHost}`);
  } catch {
    return false;
  }
}
