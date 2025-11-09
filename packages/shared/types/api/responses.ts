export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// Kling API
// ============================================================================

export interface KlingApiResponse extends ApiResponse {
  video: {
    url: string;
    file_name: string;
    content_type: string;
    file_size: number;
  };
}

export interface KlingQueueResponse extends ApiResponse {
  request_id: string;
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
