import { waveSpeedService } from "@/services/providers/wavespeed";
import { waveSpeedTaskSlots } from "@/services/videoGeneration/domain/providerTaskSlots";
import type { VideoGenerationStrategy } from "@/services/videoGeneration/ports";
import type {
  ProviderDispatchInput,
  ProviderDispatchResult
} from "@/services/videoGeneration/facades/providerFacade";
import {
  ProviderErrorCode,
  VideoGenerationServiceError
} from "@/services/videoGeneration/errors";

function normalizeDuration(durationSeconds: number): 4 | 6 | 8 {
  if (durationSeconds === 6 || durationSeconds === 8) {
    return durationSeconds;
  }

  return 4;
}

function resolveAspectRatio(
  _orientation: ProviderDispatchInput["orientation"]
): "16:9" | "9:16" {
  return "16:9";
}

function resolveWebhookUrl(input: ProviderDispatchInput): string {
  const configuredWebhookUrl = process.env.WAVESPEED_WEBHOOK_URL?.trim();
  const baseWebhookUrl = configuredWebhookUrl || input.webhookUrl;

  try {
    const url = new URL(baseWebhookUrl);
    url.pathname = "/webhooks/wavespeed";
    url.searchParams.set("jobId", input.jobId);
    url.searchParams.delete("requestId");
    url.searchParams.delete("request_id");
    return url.toString();
  } catch {
    const normalizedBaseUrl = baseWebhookUrl.replace(
      /\/webhooks\/[^/?]+/,
      "/webhooks/wavespeed"
    );
    const separator = normalizedBaseUrl.includes("?") ? "&" : "?";
    return `${normalizedBaseUrl}${separator}jobId=${encodeURIComponent(input.jobId)}`;
  }
}

export const wavespeedStrategy: VideoGenerationStrategy<
  ProviderDispatchInput,
  ProviderDispatchResult
> = {
  name: "wavespeed",
  canHandle: (input) => !input.model || input.model === "veo3.1_fast",
  async dispatch(input) {
    if (!input.imageUrls.length || !input.prompt) {
      throw new VideoGenerationServiceError(
        "Invalid provider dispatch input",
        ProviderErrorCode.INVALID_PROVIDER_INPUT,
        false,
        { provider: "wavespeed", jobId: input.jobId }
      );
    }

    const lease = await waveSpeedTaskSlots.acquire();

    try {
      const task = await waveSpeedService.submitImageToVideo({
        image: input.imageUrls[0],
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        duration: normalizeDuration(input.durationSeconds),
        aspectRatio: resolveAspectRatio(input.orientation),
        resolution: "4k",
        webhookUrl: resolveWebhookUrl(input)
      });
      lease.bind(task.id);

      return {
        provider: "wavespeed",
        model: "veo3.1_fast",
        requestId: task.id
      };
    } catch (error) {
      lease.release();
      throw error;
    }
  }
};
