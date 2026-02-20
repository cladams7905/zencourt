import type { KlingAspectRatio } from "@shared/types/api";

export type KlingSubmitInput = {
  prompt: string;
  imageUrls: string[];
  duration?: "5" | "10";
  aspectRatio?: KlingAspectRatio;
  webhookUrl?: string;
};
