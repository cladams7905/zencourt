/**
 * Centralized Storage Path Generation
 *
 * Single source of truth for storage path/key generation across both
 * Vercel and Express server to ensure consistent file organization.
 *
 * Standard format: user_{userId}/projects/project_{projectId}/...
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
 * Get the folder path for a project's images
 * Format: user_{userId}/projects/project_{projectId}
 *
 * @param projectId - Project ID
 * @param userId - User ID (required for user-scoped folders)
 * @throws Error if userId is not provided
 */
export function getProjectFolder(projectId: string, userId: string): string {
  if (!userId) {
    throw new Error(
      "User ID is required for project folder. Cannot upload without authentication."
    );
  }
  return `user_${userId}/projects/project_${projectId}`;
}

/**
 * Get the full storage key/path for a project image
 * Format: user_{userId}/projects/project_{projectId}/images/{filename}
 *
 * @param userId - User ID
 * @param projectId - Project ID
 * @param filename - Original filename
 * @returns Full storage key
 */
export function getProjectImagePath(
  userId: string,
  projectId: string,
  filename: string
): string {
  const sanitized = sanitizeFilename(filename);
  return `${getProjectFolder(projectId, userId)}/images/${sanitized}`;
}

/**
 * Get the folder path for room videos
 * Format: user_{userId}/projects/project_{projectId}/videos/video_{videoId}
 */
export function getRoomVideoFolder(userId: string, projectId: string, videoId: string): string {
  if (!userId || !projectId || !videoId) {
    throw new Error("User ID, Project ID, and Video ID are required for video storage");
  }
  return `user_${userId}/projects/project_${projectId}/videos/video_${videoId}`;
}

/**
 * Get the full storage key/path for a room video
 * Format: user_{userId}/projects/project_{projectId}/videos/video_{videoId}/room_{roomName}_{timestamp}.mp4
 */
export function getRoomVideoPath(
  userId: string,
  projectId: string,
  videoId: string,
  roomName: string
): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(roomName);
  return `${getRoomVideoFolder(userId, projectId, videoId)}/room_${sanitized}_${timestamp}.mp4`;
}

/**
 * Get the folder path for final composed video
 * Format: user_{userId}/projects/project_{projectId}/videos/video_{videoId}
 */
export function getFinalVideoFolder(userId: string, projectId: string, videoId: string): string {
  if (!userId || !projectId || !videoId) {
    throw new Error("User ID, Project ID, and Video ID are required for video storage");
  }
  return `user_${userId}/projects/project_${projectId}/videos/video_${videoId}`;
}

/**
 * Get the full storage key/path for final video
 * Format: user_{userId}/projects/project_{projectId}/videos/video_{videoId}/final_{timestamp}.mp4
 */
export function getFinalVideoPath(
  userId: string,
  projectId: string,
  videoId: string,
  projectName?: string
): string {
  const timestamp = Date.now();
  const filename = projectName
    ? `final_${sanitizeFilename(projectName)}_${timestamp}.mp4`
    : `final_${timestamp}.mp4`;
  return `${getFinalVideoFolder(userId, projectId, videoId)}/${filename}`;
}

/**
 * Get the full storage key/path for video thumbnail
 * Format: user_{userId}/projects/project_{projectId}/videos/video_{videoId}/thumb_{timestamp}.jpg
 */
export function getThumbnailPath(userId: string, projectId: string, videoId: string): string {
  const timestamp = Date.now();
  return `${getFinalVideoFolder(userId, projectId, videoId)}/thumb_${timestamp}.jpg`;
}

/**
 * Get the folder path for temporary video files during composition
 * Format: user_{userId}/projects/project_{projectId}/videos/video_{videoId}/temp
 */
export function getTempVideoFolder(userId: string, projectId: string, videoId: string): string {
  if (!userId || !projectId || !videoId) {
    throw new Error("User ID, Project ID, and Video ID are required for temp storage");
  }
  return `user_${userId}/projects/project_${projectId}/videos/video_${videoId}/temp`;
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
 * Build the user/project-scoped storage key that mirrors the structure shared by
 * both the Vercel app and the video server so assets stay co-located.
 */
export function buildUserProjectVideoKey(
  userId: string,
  projectId: string,
  filename: string,
  videoId?: string
): string {
  const safeUserId = sanitizePathSegment(userId);
  const safeProjectId = sanitizePathSegment(projectId);
  const safeFilename = sanitizePathSegment(filename);
  const videoSegment = videoId ? `/videos/video_${sanitizePathSegment(videoId)}` : "";

  return `user_${safeUserId}/projects/project_${safeProjectId}${videoSegment}/${safeFilename}`;
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
 * Generate a temporary project ID
 */
export function generateTempProjectId(): string {
  return `temp-${Date.now()}`;
}
