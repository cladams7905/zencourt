import type { CancelVideoRequest, VideoServerGenerateRequest } from "@shared/types/api";
import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";

export function parseGenerateVideoRequest(
  body: unknown
): VideoServerGenerateRequest {
  const input = (body || {}) as Partial<VideoServerGenerateRequest>;
  if (!Array.isArray(input.jobIds) || input.jobIds.length === 0) {
    throw new VideoProcessingError(
      "jobIds must be a non-empty array",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
  if (
    typeof input.batchId !== "string" ||
    input.batchId.trim().length === 0 ||
    typeof input.listingId !== "string" ||
    input.listingId.trim().length === 0 ||
    typeof input.userId !== "string" ||
    input.userId.trim().length === 0 ||
    typeof input.callbackUrl !== "string" ||
    input.callbackUrl.trim().length === 0
  ) {
    throw new VideoProcessingError(
      "Invalid request",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
  const jobIds = input.jobIds
    .map((jobId) => (typeof jobId === "string" ? jobId.trim() : ""))
    .filter((jobId) => jobId.length > 0);
  if (jobIds.length === 0) {
    throw new VideoProcessingError(
      "jobIds must be a non-empty array",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
  return {
    batchId: input.batchId.trim(),
    jobIds,
    listingId: input.listingId.trim(),
    userId: input.userId.trim(),
    callbackUrl: input.callbackUrl.trim()
  };
}

export function parseCancelVideoRequest(body: unknown): CancelVideoRequest {
  const input = (body || {}) as Partial<CancelVideoRequest>;
  if (typeof input.batchId !== "string" || input.batchId.trim().length === 0) {
    throw new VideoProcessingError(
      "batchId is required",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
  const reason =
    typeof input.reason === "string" && input.reason.trim().length > 0
      ? input.reason.trim().slice(0, 200)
      : "Canceled by user";
  return {
    batchId: input.batchId.trim(),
    reason
  };
}
