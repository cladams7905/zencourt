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
  cancelGenerationBatch: (
    batchId: string,
    reason: string
  ) => Promise<{ canceledBatches: number; canceledJobs: number }>;
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
      batchId: request.batchId,
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
      batchId: request.batchId,
      jobsStarted: result.jobsStarted
    }
  };
}

export async function handleCancelVideo(
  request: CancelVideoRequest,
  deps: CancelDeps
): Promise<{ status: 200; body: { success: true; canceledBatches: number; canceledJobs: number } }> {
  const result = await deps.cancelGenerationBatch(
    request.batchId,
    request.reason || "Canceled by user"
  );

  logger.info(
    {
      batchId: request.batchId,
      canceledBatches: result.canceledBatches,
      canceledJobs: result.canceledJobs
    },
    "Canceled video generation batch"
  );

  return {
    status: 200,
    body: {
      success: true,
      canceledBatches: result.canceledBatches,
      canceledJobs: result.canceledJobs
    }
  };
}
