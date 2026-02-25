import { ApiError } from "@web/src/server/errors/api";
import { getVideoGenerationConfig } from "@web/src/server/services/videoGeneration/config";
import type {
  CancelListingVideoGenerationArgs,
  CancelListingVideoGenerationResult
} from "../types";

function buildVideoServerGenerateRequestBody(args: {
  parentVideoId: string;
  jobIds: string[];
  listingId: string;
  userId: string;
}): string {
  const config = getVideoGenerationConfig();
  const callbackUrl = `${config.appUrl}/api/v1/webhooks/video`;

  return JSON.stringify({
    videoId: args.parentVideoId,
    jobIds: args.jobIds,
    listingId: args.listingId,
    userId: args.userId,
    callbackUrl
  });
}

async function handleVideoServerError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({}));
  const message =
    errorData.error || errorData.message || "Video server request failed";

  throw new ApiError(response.status, {
    error: "Video server error",
    message
  });
}

export async function enqueueVideoServerJobs(args: {
  parentVideoId: string;
  jobIds: string[];
  listingId: string;
  userId: string;
}): Promise<void> {
  const config = getVideoGenerationConfig();
  const requestBody = buildVideoServerGenerateRequestBody(args);

  const response = await fetch(`${config.videoServerBaseUrl}/video/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.videoServerApiKey
    },
    body: requestBody
  });

  if (!response.ok) {
    await handleVideoServerError(response);
  }
}

export async function cancelVideoServerGeneration(
  args: CancelListingVideoGenerationArgs
): Promise<CancelListingVideoGenerationResult> {
  const { listingId, reason } = args;
  const config = getVideoGenerationConfig();

  const response = await fetch(`${config.videoServerBaseUrl}/video/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.videoServerApiKey
    },
    body: JSON.stringify({
      listingId,
      reason: reason ?? "Canceled via workflow"
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error ?? payload?.message ?? "Failed to cancel generation";
    throw new ApiError(response.status, {
      error: "Video server error",
      message
    });
  }

  return {
    success: true,
    listingId,
    canceledVideos: payload?.canceledVideos ?? 0,
    canceledJobs: payload?.canceledJobs ?? 0
  };
}
