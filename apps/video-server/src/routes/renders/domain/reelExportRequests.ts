import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";
import type { PreviewTextOverlay } from "@shared/types/video";

export type VideoServerReelExportClip =
  | {
      sourceType: "listing_clip";
      clipVersionId: string;
      originalVideoUrl: string;
      upscaleUrl?: string | null;
      durationSeconds: number;
      textOverlay?: PreviewTextOverlay | null;
      supplementalAddressOverlay?: {
        overlay: PreviewTextOverlay;
        placement: "bottom-third" | "below-primary" | "low-bottom";
      } | null;
    }
  | {
      sourceType: "user_media";
      originalVideoUrl: string;
      durationSeconds: number;
      textOverlay?: PreviewTextOverlay | null;
      supplementalAddressOverlay?: {
        overlay: PreviewTextOverlay;
        placement: "bottom-third" | "below-primary" | "low-bottom";
      } | null;
    };

export type VideoServerReelExportRequest = {
  exportId: string;
  orientation: "vertical" | "landscape";
  quality: "standard" | "premium";
  clips: VideoServerReelExportClip[];
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
    quality: input.quality === "premium" ? "premium" : "standard",
    clips: input.clips.map((clip) => {
      const baseClip = {
        durationSeconds: Number(clip.durationSeconds),
        supplementalAddressOverlay: clip.supplementalAddressOverlay ?? null,
        ...(clip.textOverlay != null ? { textOverlay: clip.textOverlay } : {})
      };

      if (clip.sourceType === "user_media") {
        return {
          sourceType: "user_media" as const,
          originalVideoUrl: String(clip.originalVideoUrl),
          ...baseClip
        };
      }

      return {
        sourceType: "listing_clip" as const,
        clipVersionId: String(clip.clipVersionId),
        originalVideoUrl: String(clip.originalVideoUrl),
        upscaleUrl:
          clip.upscaleUrl == null ? null : String(clip.upscaleUrl),
        ...baseClip
      };
    })
  };
}
