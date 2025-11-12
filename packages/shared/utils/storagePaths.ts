/**
 * Centralized Storage Path Generation
 *
 * Single source of truth for S3 path/key generation across both
 * Vercel and Express server to ensure consistent file organization.
 *
 * Standard format: user_{userId}/projects/project_{projectId}/...
 */

import { nanoid } from "nanoid";

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
 * Get the full S3 key/path for a project image
 * Format: user_{userId}/projects/project_{projectId}/images/{filename}
 *
 * @param userId - User ID
 * @param projectId - Project ID
 * @param filename - Original filename
 * @returns Full S3 key
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
 * Get the full S3 key/path for a room video
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
 * Get the full S3 key/path for final video
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
 * Get the full S3 key/path for video thumbnail
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
 * @returns Full S3 key
 */
export function getGenericUploadPath(folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = nanoid(8);
  const sanitized = sanitizeFilename(filename);
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "_");
  return `${sanitizedFolder}/${timestamp}-${random}/${sanitized}`;
}

/**
 * Extract S3 key from URL
 * Handles both formats:
 * - https://bucket.s3.region.amazonaws.com/key
 * - s3://bucket/key
 *
 * @param url - S3 URL
 * @returns S3 object key
 */
export function extractS3KeyFromUrl(url: string): string {
  // Handle s3:// URLs
  if (url.startsWith("s3://")) {
    const parts = url.replace("s3://", "").split("/");
    parts.shift(); // Remove bucket name
    return parts.join("/");
  }

  // Handle HTTPS URLs
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    return urlObj.pathname.substring(1);
  } catch {
    throw new Error(`Invalid S3 URL format: ${url}`);
  }
}

/**
 * Generate a temporary project ID
 */
export function generateTempProjectId(): string {
  return `temp-${Date.now()}`;
}
