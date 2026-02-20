import { runwayService } from "@/services/runwayService";
import type { VideoGenerationProviderStrategy } from "@/services/videoGeneration/ports";
import type {
  ProviderDispatchInput,
  ProviderDispatchResult
} from "@/services/videoGeneration/facades/providerFacade";

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
          throw new Error("Runway task missing output URL");
        }
        return { outputUrl };
      }
    };
  }
};
