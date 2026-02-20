import logger from "@/config/logger";
import type {
  CancelVideoRequest,
  VideoServerGenerateRequest,
  VideoServerGenerateResponse
} from "@shared/types/api";

type GenerateResult = {
  jobsStarted: number;
};

type GenerateService = {
  startGeneration: (request: VideoServerGenerateRequest) => Promise<GenerateResult>;
};

type CancelDeps = {
  cancelVideosByListing: (listingId: string, reason: string) => Promise<number>;
  cancelVideosByIds: (videoIds: string[], reason: string) => Promise<number>;
  cancelJobsByListingId: (listingId: string, reason: string) => Promise<number>;
};

type GenerateDeps = {
  generationService: GenerateService;
};

export async function handleGenerateVideo(
  request: VideoServerGenerateRequest,
  deps: GenerateDeps
): Promise<{ status: 202; body: VideoServerGenerateResponse }> {
  logger.info(
    {
      videoId: request.videoId,
      listingId: request.listingId,
      jobCount: request.jobIds.length,
      jobIds: request.jobIds
    },
    "[VideoRoute] Starting video generation for jobs"
  );

  const result = await deps.generationService.startGeneration(request);
  return {
    status: 202,
    body: {
      success: true,
      message: "Video generation started",
      videoId: request.videoId,
      jobsStarted: result.jobsStarted
    }
  };
}

export async function handleCancelVideo(
  request: CancelVideoRequest,
  deps: CancelDeps
): Promise<{ status: 200; body: { success: true; canceledVideos: number; canceledJobs: number } }> {
  const canceledVideos =
    Array.isArray(request.videoIds) && request.videoIds.length > 0
      ? await deps.cancelVideosByIds(request.videoIds, request.reason || "Canceled by user")
      : await deps.cancelVideosByListing(
          request.listingId,
          request.reason || "Canceled by user"
        );

  const canceledJobs = await deps.cancelJobsByListingId(
    request.listingId,
    request.reason || "Canceled by user"
  );

  logger.info(
    { listingId: request.listingId, canceledVideos, canceledJobs },
    "Canceled video generation for listing"
  );

  return {
    status: 200,
    body: {
      success: true,
      canceledVideos,
      canceledJobs
    }
  };
}
