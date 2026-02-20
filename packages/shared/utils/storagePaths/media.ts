import { nanoid } from "nanoid";
import { sanitizeFilename, sanitizePathSegment } from "./sanitize";

/**
 * Generate a generic upload path with timestamp and random ID.
 * Format: {folder}/{timestamp}-{random}/{filename}
 */
export function getGenericUploadPath(folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = nanoid(8);
  const sanitized = sanitizeFilename(filename);
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "_");
  return `${sanitizedFolder}/${timestamp}-${random}/${sanitized}`;
}

/**
 * Get the folder path for user media uploads.
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
 * Get the folder path for user media thumbnails.
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
 * Get the full storage key/path for user media.
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
 * Get the full storage key/path for user media thumbnails.
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
