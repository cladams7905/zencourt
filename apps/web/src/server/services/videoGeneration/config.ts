import type { VideoOrientation } from "@shared/types/models";

export const VIDEO_GENERATION_MODEL = "veo3.1_fast";
export const VIDEO_GENERATION_DEFAULT_ORIENTATION: VideoOrientation = "vertical";
export const VIDEO_GENERATION_ENABLE_PRIORITY_SECONDARY = true;

export const VIDEO_SERVER_URL_ENV_KEY = "VIDEO_SERVER_URL";
export const VIDEO_SERVER_API_KEY_ENV_KEY = "VIDEO_SERVER_API_KEY";

export type VideoGenerationConfig = {
  model: string;
  defaultOrientation: VideoOrientation;
  enablePrioritySecondary: boolean;
  videoServerBaseUrl: string;
  videoServerApiKey: string;
};

export function getVideoGenerationConfig(): VideoGenerationConfig {
  const baseUrl = process.env[VIDEO_SERVER_URL_ENV_KEY]?.trim();
  const apiKey = process.env[VIDEO_SERVER_API_KEY_ENV_KEY]?.trim();

  if (!baseUrl || !apiKey) {
    throw new Error(
      `${VIDEO_SERVER_URL_ENV_KEY} and ${VIDEO_SERVER_API_KEY_ENV_KEY} must be configured`
    );
  }

  return {
    model: VIDEO_GENERATION_MODEL,
    defaultOrientation: VIDEO_GENERATION_DEFAULT_ORIENTATION,
    enablePrioritySecondary: VIDEO_GENERATION_ENABLE_PRIORITY_SECONDARY,
    videoServerBaseUrl: baseUrl.replace(/\/+$/, ""),
    videoServerApiKey: apiKey
  };
}
