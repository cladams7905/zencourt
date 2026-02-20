// ============================================================================
// Storage Uploads
// ============================================================================

import { VideoOrientation } from "../models";

export interface StorageUploadRequest {
  fileBuffer: ArrayBuffer;
  fileName: string;
  contentType: string;
  options?: {
    folder?: string;
    userId?: string;
    listingId?: string;
    storageKey?: string;
  };
}

// ============================================================================
// Video Generation
// ============================================================================

export interface VideoGenerateRequest {
  listingId: string;
  orientation?: VideoOrientation;
  aiDirections?: string;
}
