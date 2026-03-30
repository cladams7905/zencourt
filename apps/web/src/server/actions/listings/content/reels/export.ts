import { nanoid } from "nanoid";
import { ApiError } from "@web/src/server/errors/api";
import { StatusCode } from "@shared/types/api";
import { withCurrentUserListingAccess } from "@web/src/server/actions/shared/auth";
import { getCurrentVideoClipsWithCurrentVersionsByListingId } from "@web/src/server/models/video";
import { getUserMediaByIds } from "@web/src/server/models/user/media";
import type {
  ListingReelExportQuality,
  ListingReelExportRequest
} from "@web/src/lib/domain/listings/content/reels";

export type { ListingReelExportRequest as PlayablePreviewExportRequest };

export function buildListingReelExportFilename(filenameBase?: string) {
  const normalizedBase =
    filenameBase?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
    "reel-preview";
  return `${normalizedBase.replace(/^-|-$/g, "") || "reel-preview"}.mp4`;
}

export async function assertListingReelExportAccessForCurrentUser(
  listingId: string
) {
  await withCurrentUserListingAccess(listingId, async () => undefined);
}

export async function buildListingReelExportRequestForCurrentUser(
  listingId: string,
  input: ListingReelExportRequest
) {
  if (!Array.isArray(input.segments) || input.segments.length < 1) {
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message: "At least one reel segment is required."
    });
  }

  return withCurrentUserListingAccess(listingId, async ({ user }) => {
    const quality: ListingReelExportQuality = input.quality ?? "standard";
    const clipRows = await getCurrentVideoClipsWithCurrentVersionsByListingId(
      listingId
    );
    const clipVersionByClipId = new Map(
      clipRows
        .filter((row) => Boolean(row.clipVersion.videoUrl))
        .map((row) => [row.clip.id, row.clipVersion] as const)
    );
    const userMediaIds = input.segments
      .filter((segment) => segment.sourceType === "user_media")
      .map((segment) => segment.sourceId);
    const userMediaRows = await getUserMediaByIds(user.id, userMediaIds);
    const userMediaUrlById = new Map(
      userMediaRows
        .filter((row) => Boolean(row.url))
        .map((row) => [row.id, row.url as string])
    );

    const clips = input.segments.map((segment) => {
      if (segment.sourceType === "user_media") {
        const originalVideoUrl = userMediaUrlById.get(segment.sourceId);

        if (!originalVideoUrl) {
          throw new ApiError(StatusCode.NOT_FOUND, {
            error: "Not found",
            message: "Reel draft source not found"
          });
        }

        return {
          sourceType: "user_media" as const,
          originalVideoUrl,
          durationSeconds: segment.durationSeconds,
          textOverlay: segment.textOverlay ?? null,
          supplementalAddressOverlay: segment.supplementalAddressOverlay ?? null
        };
      }

      const clipVersion = clipVersionByClipId.get(segment.sourceId);
      if (!clipVersion?.videoUrl) {
        throw new ApiError(StatusCode.NOT_FOUND, {
          error: "Not found",
          message: "Reel draft source not found"
        });
      }

      return {
        sourceType: "listing_clip" as const,
        clipVersionId: clipVersion.id,
        originalVideoUrl: clipVersion.videoUrl,
        upscaleUrl: clipVersion.upscaleUrl ?? null,
        durationSeconds: segment.durationSeconds,
        textOverlay: segment.textOverlay ?? null,
        supplementalAddressOverlay: segment.supplementalAddressOverlay ?? null
      };
    });

    return {
      filename: buildListingReelExportFilename(input.filenameBase),
      request: {
        exportId: nanoid(),
        orientation: "vertical" as const,
        quality,
        clips
      }
    };
  });
}
