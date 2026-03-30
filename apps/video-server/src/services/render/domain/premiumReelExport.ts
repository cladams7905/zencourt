import type { ListingClip } from "@/services/render/providers/remotion/composition/ListingVideo";
import logger from "@/config/logger";
import type {
  VideoServerReelExportClip,
  VideoServerReelExportRequest
} from "@/routes/renders/domain/reelExportRequests";

type UpscaleListingClip = (input: {
  clipVersionId: string;
  sourceUrl: string;
}) => Promise<{ url: string }>;

type PersistUpscaleUrl = (
  clipVersionId: string,
  upscaleUrl: string
) => Promise<void>;

type PrepareReelExportClipDeps = {
  upscaleListingClip: UpscaleListingClip;
  persistUpscaleUrl: PersistUpscaleUrl;
  maxUpscaleAttempts?: number;
  maxUpscaleConcurrency?: number;
  onListingClipPrepared?: (params: {
    clipVersionId: string;
    completedCount: number;
    totalCount: number;
  }) => void;
};

function toListingClip(
  clip: VideoServerReelExportClip,
  src: string
): ListingClip {
  return {
    src,
    durationSeconds: clip.durationSeconds,
    ...(clip.textOverlay ? { textOverlay: clip.textOverlay } : {}),
    supplementalAddressOverlay: clip.supplementalAddressOverlay ?? null
  };
}

function isTransientUpscaleError(error: unknown) {
  if (!(error instanceof Error)) {
    return true;
  }

  return !/invalid|validation|unsupported/i.test(error.message);
}

async function preparePremiumListingClip(
  request: VideoServerReelExportRequest,
  clip: Extract<VideoServerReelExportClip, { sourceType: "listing_clip" }>,
  deps: PrepareReelExportClipDeps
): Promise<ListingClip> {
  if (clip.upscaleUrl) {
    logger.info(
      {
        exportId: request.exportId,
        clipVersionId: clip.clipVersionId
      },
      "[PremiumReelExport] Reusing cached upscale url"
    );
    return toListingClip(clip, clip.upscaleUrl);
  }

  const maxAttempts = Math.max(1, deps.maxUpscaleAttempts ?? 3);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      logger.info(
        {
          exportId: request.exportId,
          clipVersionId: clip.clipVersionId,
          attempt,
          maxAttempts
        },
        "[PremiumReelExport] Starting upscale attempt"
      );
      const result = await deps.upscaleListingClip({
        clipVersionId: clip.clipVersionId,
        sourceUrl: clip.originalVideoUrl
      });
      await deps.persistUpscaleUrl(clip.clipVersionId, result.url);
      logger.info(
        {
          exportId: request.exportId,
          clipVersionId: clip.clipVersionId,
          attempt
        },
        "[PremiumReelExport] Upscale completed"
      );
      return toListingClip(clip, result.url);
    } catch (error) {
      lastError = error;
      const logContext = {
        exportId: request.exportId,
        clipVersionId: clip.clipVersionId,
        attempt,
        maxAttempts,
        error: error instanceof Error ? error.message : String(error)
      };
      if (!isTransientUpscaleError(error) || attempt === maxAttempts) {
        logger.error(
          logContext,
          "[PremiumReelExport] Upscale failed permanently"
        );
        break;
      }
      logger.warn(logContext, "[PremiumReelExport] Upscale attempt failed, retrying");
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to upscale reel export clip");
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  maxConcurrency: number,
  worker: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex] as TInput, currentIndex);
    }
  }

  const workerCount = Math.min(Math.max(1, maxConcurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

export async function prepareReelExportClips(
  request: VideoServerReelExportRequest,
  deps: PrepareReelExportClipDeps
): Promise<ListingClip[]> {
  if (request.quality !== "premium") {
    return request.clips.map((clip) => toListingClip(clip, clip.originalVideoUrl));
  }

  const maxUpscaleConcurrency = Math.max(1, deps.maxUpscaleConcurrency ?? 3);
  const totalListingClips = request.clips.filter(
    (clip) => clip.sourceType === "listing_clip"
  ).length;
  let completedListingClips = 0;

  return mapWithConcurrency(
    request.clips,
    maxUpscaleConcurrency,
    async (clip) => {
      if (clip.sourceType === "user_media") {
        return toListingClip(clip, clip.originalVideoUrl);
      }

      const preparedClip = await preparePremiumListingClip(request, clip, deps);
      completedListingClips += 1;
      deps.onListingClipPrepared?.({
        clipVersionId: clip.clipVersionId,
        completedCount: completedListingClips,
        totalCount: totalListingClips
      });
      return preparedClip;
    }
  );
}
