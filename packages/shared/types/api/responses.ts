export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// S3 Storage
// ============================================================================

export interface S3UploadResponse extends ApiResponse {
  key: string | null;
  url: string | null;
}

export interface S3UploadBatchResponse extends ApiResponse {
  results: (S3UploadResponse & { filename: string })[];
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
