import { runwayService } from "@/services/providers/runway";
import type { VideoGenerationProviderStrategy } from "@/services/videoGeneration/ports";
import type {
  ProviderDispatchInput,
  ProviderDispatchResult
} from "@/services/videoGeneration/facades/providerFacade";
import {
  ProviderErrorCode,
  VideoGenerationServiceError
} from "@/services/videoGeneration/errors";

function normalizeRunwayDuration(_durationSeconds: number): 4 | 6 | 8 {
  return 4;
}

export const runwayStrategy: VideoGenerationProviderStrategy<
  ProviderDispatchInput,
  ProviderDispatchResult
> = {
  name: "runway",
  canHandle: () => true,
  async dispatch(input) {
    if (!input.imageUrls.length || !input.prompt) {
      throw new VideoGenerationServiceError(
        "Invalid provider dispatch input",
        ProviderErrorCode.INVALID_PROVIDER_INPUT,
        false,
        { provider: "runway", jobId: input.jobId }
      );
    }
    const runwayDurationSeconds = normalizeRunwayDuration(input.durationSeconds);
    const runwayRatio = input.orientation === "vertical" ? "720:1280" : "1280:720";

    const task = await runwayService.submitImageToVideo({
      promptImage: input.imageUrls[0],
      promptText: input.prompt,
      ratio: runwayRatio,
      duration: runwayDurationSeconds
    });

    return {
      provider: "runway",
      model: "veo3.1_fast",
      requestId: task.id,
      waitForOutput: async () => {
        const result = await task.waitForTaskOutput();
        const outputUrl = result?.output?.[0]?.uri;
        if (!outputUrl) {
          throw new VideoGenerationServiceError(
            "Provider output URL missing",
            ProviderErrorCode.PROVIDER_OUTPUT_MISSING,
            false,
            { provider: "runway", jobId: input.jobId }
          );
        }
        return { outputUrl };
      }
    };
  }
};
