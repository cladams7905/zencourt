import { klingService } from "@/services/providers/kling";
import type { VideoGenerationProviderStrategy } from "@/services/videoGeneration/ports";
import type {
  ProviderDispatchInput,
  ProviderDispatchResult
} from "@/services/videoGeneration/facades/providerFacade";
import {
  ProviderErrorCode,
  VideoGenerationServiceError
} from "@/services/videoGeneration/errors";

export const klingStrategy: VideoGenerationProviderStrategy<
  ProviderDispatchInput,
  ProviderDispatchResult
> = {
  name: "kling",
  canHandle: () => true,
  async dispatch(input) {
    if (!input.imageUrls.length || !input.prompt) {
      throw new VideoGenerationServiceError(
        "Invalid provider dispatch input",
        ProviderErrorCode.INVALID_PROVIDER_INPUT,
        false,
        { provider: "kling", jobId: input.jobId }
      );
    }
    const aspectRatio = input.orientation === "vertical" ? "9:16" : "16:9";
    const klingDuration = (input.durationSeconds >= 8 ? "10" : "5") as "5" | "10";

    const requestId = await klingService.submitRoomVideo({
      prompt: input.prompt,
      imageUrls: input.imageUrls,
      duration: klingDuration,
      aspectRatio,
      webhookUrl: input.webhookUrl
    });

    return {
      provider: "kling",
      model: "kling1.6",
      requestId
    };
  }
};
