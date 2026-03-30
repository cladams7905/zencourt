import WaveSpeed from "wavespeed";
import logger from "@/config/logger";

type WaveSpeedRunResult = {
  outputs?: string[];
};

export async function upscaleVideoTo4k(input: {
  sourceUrl: string;
}): Promise<{ url: string }> {
  const apiKey = process.env.WAVESPEED_API_KEY;

  if (!apiKey) {
    throw new Error("WAVESPEED_API_KEY is required for premium reel exports");
  }

  const client = new WaveSpeed(apiKey);
  logger.info(
    {
      model: "wavespeed-ai/video-upscaler"
    },
    "[WaveSpeedUpscaler] Submitting upscale request"
  );
  const result = (await client.run("wavespeed-ai/video-upscaler", {
    target_resolution: "4k",
    video: input.sourceUrl
  })) as WaveSpeedRunResult;

  const outputUrl =
    Array.isArray(result.outputs) && typeof result.outputs[0] === "string"
      ? result.outputs[0]
      : null;

  if (!outputUrl) {
    logger.error(
      {
        model: "wavespeed-ai/video-upscaler"
      },
      "[WaveSpeedUpscaler] SDK returned no output url"
    );
    throw new Error("WaveSpeed SDK did not return an output url");
  }

  logger.info(
    {
      model: "wavespeed-ai/video-upscaler"
    },
    "[WaveSpeedUpscaler] Upscale completed"
  );

  return { url: outputUrl };
}
