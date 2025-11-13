// ============================================================================
// Kling API
// ============================================================================

export interface KlingApiRequest {
  prompt: string;
  input_image_urls: string[]; // Array of image URLs (up to 4 for elements endpoint)
  duration?: "5" | "10";
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  negative_prompt?: string;
}

// ============================================================================
// S3 Storage
// ============================================================================

export interface S3UploadRequest {
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
  compositionSettings: {
    roomOrder: string[];
    musicUrl?: string;
    musicVolume?: number;
    transitions?: {
      type: string;
      duration: number;
    };
  };
}

export interface VideoProcessPayload {
  jobId: string;
  projectId: string;
  userId: string;
  roomVideoUrls: Array<{
    roomId: string;
    url: string;
  }>;
  compositionSettings: {
    roomOrder: string[];
    musicUrl?: string | null;
    musicVolume?: number;
    transitions?: {
      type: string;
      duration: number;
    } | null;
  };
  webhookUrl: string;
  webhookSecret: string;
}
