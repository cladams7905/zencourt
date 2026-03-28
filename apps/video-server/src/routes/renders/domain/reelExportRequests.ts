import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";
import type { PreviewTextOverlay } from "@shared/types/video";

export type VideoServerReelExportRequest = {
  exportId: string;
  orientation: "vertical" | "landscape";
  clips: Array<{
    src: string;
    durationSeconds: number;
    textOverlay?: PreviewTextOverlay;
    supplementalAddressOverlay?: {
      overlay: PreviewTextOverlay;
      placement: "bottom-third" | "below-primary" | "low-bottom";
    } | null;
  }>;
};

export function parseCreateReelExportRequest(
  body: unknown
): VideoServerReelExportRequest {
  const input = (body ?? {}) as Partial<VideoServerReelExportRequest>;
  if (typeof input.exportId !== "string" || input.exportId.trim().length === 0) {
    throw new VideoProcessingError(
      "exportId required",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
  if (input.orientation !== "vertical" && input.orientation !== "landscape") {
    throw new VideoProcessingError(
      "orientation required",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
  if (!Array.isArray(input.clips) || input.clips.length === 0) {
    throw new VideoProcessingError(
      "clips required",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }

  return {
    exportId: input.exportId.trim(),
    orientation: input.orientation,
    clips: input.clips.map((clip) => ({
      src: String(clip.src),
      durationSeconds: Number(clip.durationSeconds),
      supplementalAddressOverlay: clip.supplementalAddressOverlay ?? null,
      ...(clip.textOverlay != null ? { textOverlay: clip.textOverlay } : {})
    }))
  };
}
