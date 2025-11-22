export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// Storage Uploads
// ============================================================================

export interface StorageUploadResponse extends ApiResponse {
  key: string | null;
  url: string | null;
}

export interface StorageUploadBatchResponse extends ApiResponse {
  results: (StorageUploadResponse & { filename: string })[];
}

// ============================================================================
// Video Generation
// ============================================================================

export interface VideoGenerateResponse extends ApiResponse {
  projectId: string;
  videoId: string;
  jobIds: string[];
  jobCount: number;
}
