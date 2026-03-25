import type { RunwayGenerationModel } from "@/services/videoGeneration/domain/runwayModels";

export type RunwaySubmitInput = {
  model: RunwayGenerationModel;
  promptImage: string;
  promptText: string;
  ratio: "1280:720" | "720:1280" | "1080:1920" | "1920:1080";
  duration?: 4 | 6 | 8;
  audio?: boolean;
};
