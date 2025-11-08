/**
 * Storage Service
 *
 * Handles file uploads via the server-side S3 API route.
 * Includes support for images and videos.
 */

import { UploadResult } from "@/types/images";
import type { VideoStorageConfig } from "@/types/video-generation";

export interface StorageService {
  uploadFile(file: File, folder: string): Promise<string>;
  uploadFiles(files: File[], folder: string): Promise<UploadResult[]>;
  deleteFile?(url: string): Promise<void>;
}

/**
 * Get the base URL for server-side API calls
 */
function getBaseUrl(): string {
  // For server-side rendering, we need an absolute URL
  if (typeof window === "undefined") {
    // Check for Vercel deployment URL
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Check for custom domain
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    // Fallback to localhost for development
    return "http://localhost:3000";
  }
  // Client-side can use relative URLs
  return "";
}

/**
 * Upload a single file to storage
 * Uses Vercel Blob directly on server-side, API route on client-side
 * @param file - File to upload
 * @param folder - Folder path for organization (e.g., "projects/abc123")
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/blob`;

    const response = await fetch(url, {
      method: "PUT",
      body: formData
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Upload failed");
    }

    return data.url;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error(
      `Failed to upload ${file.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Upload multiple files to storage with individual error handling
 * @param files - Array of files to upload
 * @param folder - Folder path for organization
 * @returns Array of upload results with status for each file
 */
export async function uploadFiles(
  files: File[],
  folder: string
): Promise<UploadResult[]> {
  const uploadPromises = files.map(async (file) => {
    try {
      const url = await uploadFile(file, folder);
      return {
        id: generateFileId(file),
        url,
        status: "success" as const
      };
    } catch (error) {
      return {
        id: generateFileId(file),
        url: "",
        status: "error" as const,
        error: error instanceof Error ? error.message : "Upload failed"
      };
    }
  });

  return Promise.all(uploadPromises);
}

/**
 * Delete a file from storage via API route
 * @param url - URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/blob`;

    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Delete failed");
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error(
      `Failed to delete file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate a unique ID for a file based on its properties
 */
function generateFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Get the folder path for a project
 * @param projectId - Project ID (can be temp-{timestamp} or final project name)
 * @param userId - User ID for user-scoped folders (required)
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
 * Generate a temporary project ID
 */
export function generateTempProjectId(): string {
  return `temp-${Date.now()}`;
}

export const storageService: StorageService = {
  uploadFile,
  uploadFiles,
  deleteFile
};

// ============================================================================
// Video Storage Functions
// ============================================================================

/**
 * Get the folder path for room videos
 * Uses format: user_{userId}/videos/video_{videoId}
 */
export function getRoomVideoFolder(config: VideoStorageConfig): string {
  const { userId, videoId } = config;
  if (!userId || !videoId) {
    throw new Error("User ID and Video ID are required for video storage");
  }
  return `user_${userId}/videos/${videoId}`;
}

/**
 * Get the folder path for final combined video
 * Uses format: user_{userId}/videos/video_{videoId}
 */
export function getFinalVideoFolder(userId: string, videoId: string): string {
  if (!userId || !videoId) {
    throw new Error("User ID and Video ID are required for video storage");
  }
  return `user_${userId}/videos/${videoId}`;
}

/**
 * Get the folder path for temporary video files during composition
 */
export function getTempVideoFolder(userId: string, videoId: string): string {
  if (!userId || !videoId) {
    throw new Error("User ID and Video ID are required for temp storage");
  }
  return `user_${userId}/videos/${videoId}/temp`;
}

/**
 * Upload a room video to storage
 */
export async function uploadRoomVideo(
  videoBlob: Blob,
  config: VideoStorageConfig,
  roomName: string
): Promise<string> {
  try {
    const folder = getRoomVideoFolder(config);
    const filename = `${sanitizeFilename(roomName)}_${Date.now()}.mp4`;
    const file = new File([videoBlob], filename, { type: "video/mp4" });

    return await uploadFile(file, folder);
  } catch (error) {
    console.error("Error uploading room video:", error);
    throw new Error(
      `Failed to upload room video: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Upload the final combined video to storage
 */
export async function uploadFinalVideo(
  videoBlob: Blob,
  userId: string,
  videoId: string,
  projectName?: string
): Promise<string> {
  try {
    const folder = getFinalVideoFolder(userId, videoId);
    const filename = projectName
      ? `${sanitizeFilename(projectName)}_final_${Date.now()}.mp4`
      : `final_video_${Date.now()}.mp4`;
    const file = new File([videoBlob], filename, { type: "video/mp4" });

    return await uploadFile(file, folder);
  } catch (error) {
    console.error("Error uploading final video:", error);
    throw new Error(
      `Failed to upload final video: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Upload a thumbnail image to storage
 */
export async function uploadThumbnail(
  thumbnailBlob: Blob,
  userId: string,
  videoId: string
): Promise<string> {
  try {
    const folder = getFinalVideoFolder(userId, videoId);
    const filename = `final_thumb_${Date.now()}.jpg`;
    const file = new File([thumbnailBlob], filename, { type: "image/jpeg" });

    return await uploadFile(file, folder);
  } catch (error) {
    console.error("Error uploading thumbnail:", error);
    throw new Error(
      `Failed to upload thumbnail: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Download a video from a URL (e.g., from Kling API response)
 */
export async function downloadVideoFromUrl(url: string): Promise<Blob> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error("Downloaded video is empty");
    }

    return blob;
  } catch (error) {
    console.error("Error downloading video:", error);
    throw new Error(
      `Failed to download video from URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Execute storage operation with retry logic
 */
export async function executeStorageWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(
          `Storage operation failed, retrying in ${delay}ms (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Clean up temporary video files
 */
export async function cleanupTempVideos(
  userId: string,
  projectId: string,
  tempUrls: string[]
): Promise<void> {
  try {
    const deletePromises = tempUrls.map((url) =>
      deleteFile(url).catch((error) => {
        console.warn(`Failed to delete temp file ${url}:`, error);
        // Don't throw - cleanup is best-effort
      })
    );

    await Promise.all(deletePromises);
    console.log(`Cleaned up ${tempUrls.length} temporary video files`);
  } catch (error) {
    console.warn("Error during temp file cleanup:", error);
    // Don't throw - cleanup is best-effort
  }
}

/**
 * Sanitize filename for storage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
