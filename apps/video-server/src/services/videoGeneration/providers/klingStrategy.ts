import { klingService } from "@/services/klingService";
import type { VideoGenerationProviderStrategy } from "@/services/videoGeneration/ports";
import type {
  ProviderDispatchInput,
  ProviderDispatchResult
} from "@/services/videoGeneration/facades/providerFacade";

export const klingStrategy: VideoGenerationProviderStrategy<
  ProviderDispatchInput,
  ProviderDispatchResult
> = {
  name: "kling",
  canHandle: () => true,
  async dispatch(input) {
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
