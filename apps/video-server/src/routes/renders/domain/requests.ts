import { Request } from "express";
import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";
import type { VideoServerRenderRequest } from "@shared/types/api";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";

export function parseCreateRenderRequest(
  body: unknown
): VideoServerRenderRequest {
  const input = (body || {}) as Partial<VideoServerRenderRequest>;
  if (typeof input.videoId !== "string" || input.videoId.trim().length === 0) {
    throw new VideoProcessingError(
      "videoId required",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
  return {
    videoId: input.videoId.trim(),
    textOverlaysByJobId: input.textOverlaysByJobId
  };
}

export function parseRenderJobIdParam(req: Request): string {
  try {
    return parseRequiredRouteParam(req.params?.jobId, "jobId");
  } catch (error) {
    throw new VideoProcessingError(
      error instanceof Error ? error.message : "jobId required",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
}
