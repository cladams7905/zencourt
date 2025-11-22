// ============================================================================
// Kling API
// ============================================================================

import { VideoOrientation } from "../models";

export interface KlingApiRequest {
  prompt: string;
  input_image_urls: string[]; // Array of image URLs (up to 4 for elements endpoint)
  duration?: "5" | "10";
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  negative_prompt?: string;
}

// ============================================================================
// Storage Uploads
// ============================================================================

export interface StorageUploadRequest {
  fileBuffer: ArrayBuffer;
  fileName: string;
  contentType: string;
  options?: {
    folder?: string;
    userId?: string;
    projectId?: string;
  };
}

// ============================================================================
// Video Generation
// ============================================================================

export interface VideoGenerateRequest {
  projectId: string;
  orientation: VideoOrientation;
  rooms: Array<{
    id: string;
    name: string;
    category?: string;
    roomNumber?: number;
    imageCount?: number;
  }>;
  aiDirections?: string;
  duration?: "5" | "10";
}
