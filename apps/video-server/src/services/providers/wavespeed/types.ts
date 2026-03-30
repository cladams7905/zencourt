export type WaveSpeedAspectRatio = "16:9" | "9:16";

export type WaveSpeedResolution = "720p" | "1080p" | "4k";

export type WaveSpeedSubmitInput = {
  image: string;
  prompt: string;
  negativePrompt: string;
  duration: 4 | 6 | 8;
  aspectRatio: WaveSpeedAspectRatio;
  resolution: WaveSpeedResolution;
  webhookUrl: string;
};

export type WaveSpeedTaskStatus = "pending" | "completed" | "failed";

export type WaveSpeedTaskResult = {
  id: string;
  status: WaveSpeedTaskStatus;
  outputs?: string[];
  error?: string | null;
};
