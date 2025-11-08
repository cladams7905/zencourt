/**
 * Storage Service
 *
 * Client-side wrapper for S3 storage operations via server actions.
 * Includes support for images and videos.
 */

import { UploadResult } from "@/types/images";
import type { VideoStorageConfig } from "@/types/video-generation";
import {
  getProjectFolder,
  getRoomVideoFolder,
  getFinalVideoFolder,
  getTempVideoFolder,
  generateTempProjectId
} from "@/server/lib/storage-paths";
import {
  uploadFileToS3,
  uploadFilesToS3,
  deleteFileFromS3
} from "@/server/actions/api/storage";

/**
 * Upload a single file to storage via server action
 * @param file - File to upload
 * @param folder - Folder path for organization (e.g., "projects/abc123")
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const result = await uploadFileToS3(arrayBuffer, file.name, file.type, {
      folder
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.url;
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
 * Batch upload multiple files to S3 in a single server action call
 * More efficient than individual uploads for multiple files
 * @param files - Array of files to upload
 * @param folder - Folder path for organization
 * @param userId - User ID for organized storage (optional)
 * @param projectId - Project ID for organized storage (optional)
 * @returns Array of upload results with status for each file
 */
export async function uploadFilesBatch(
  files: File[],
  folder: string,
  userId?: string,
  projectId?: string
): Promise<UploadResult[]> {
  try {
    // Convert files to array buffers
    const filesWithBuffers = await Promise.all(
      files.map(async (file) => ({
        buffer: await file.arrayBuffer(),
        name: file.name,
        type: file.type
      }))
    );

    const result = await uploadFilesToS3(filesWithBuffers, {
      folder,
      userId,
      projectId
    });

    if (!result.success) {
      throw new Error("Batch upload failed");
    }

    // Map results to UploadResult format
    return files.map((file, index) => {
      const uploadResult = result.results[index];
      if (uploadResult && uploadResult.success) {
        return {
          id: generateFileId(file),
          url: uploadResult.url!,
          status: "success" as const
        };
      } else {
        return {
          id: generateFileId(file),
          url: "",
          status: "error" as const,
          error: uploadResult?.error || "Upload failed"
        };
      }
    });
  } catch (error) {
    console.error("Error in batch upload:", error);
    // Fallback to individual uploads if batch fails
    console.log("Falling back to individual uploads...");
    return uploadFiles(files, folder);
  }
}

/**
 * Delete a file from storage via server action
 * @param url - URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    const result = await deleteFileFromS3(url);

    if (!result.success) {
      throw new Error(result.error);
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

// Re-export path generation functions from centralized library
export {
  getProjectFolder,
  getRoomVideoFolder,
  getFinalVideoFolder,
  getTempVideoFolder,
  generateTempProjectId
};

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
