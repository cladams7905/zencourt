export type KlingAspectRatio = "16:9" | "9:16" | "1:1";

export type KlingSubmitInput = {
  prompt: string;
  imageUrls: string[];
  duration?: "5" | "10";
  aspectRatio?: KlingAspectRatio;
  webhookUrl?: string;
};
