/**
 * Kling API Types
 *
 * Type definitions for the Kling API video generation service
 */

export interface KlingApiRequest {
  prompt: string;
  input_image_urls: string[]; // Array of image URLs (up to 4 for elements endpoint)
  duration?: "5" | "10";
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  negative_prompt?: string;
}

export interface KlingApiResponse {
  video: {
    url: string;
    file_name: string;
    content_type: string;
    file_size: number;
  };
}

export interface KlingQueueResponse {
  request_id: string;
}

export interface KlingApiError {
  error: string;
  message: string;
  code?: string;
  status?: number;
}

export interface KlingServiceConfig {
  apiKey: string;
  maxRetries: number;
  timeoutMs: number;
  concurrentRequests: number;
}
