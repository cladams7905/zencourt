import type { GENERATION_MODELS } from "@shared/types/models";

export const DEFAULT_RUNWAY_MODEL = "gen4.5" as const;

export const RUNWAY_MODELS = [
  DEFAULT_RUNWAY_MODEL,
  "veo3.1_fast",
  "runway-gen4-turbo"
] as const satisfies readonly GENERATION_MODELS[];

export type RunwayGenerationModel = (typeof RUNWAY_MODELS)[number];

export function isRunwayGenerationModel(
  model: string | null | undefined
): model is RunwayGenerationModel {
  return RUNWAY_MODELS.includes(model as RunwayGenerationModel);
}

export function resolveRunwayGenerationModel(
  model: string | null | undefined
): RunwayGenerationModel {
  if (isRunwayGenerationModel(model)) {
    return model;
  }

  return DEFAULT_RUNWAY_MODEL;
}

export function toRunwayApiModel(model: RunwayGenerationModel): "gen4.5" | "veo3.1_fast" | "gen4_turbo" {
  if (model === "runway-gen4-turbo") {
    return "gen4_turbo";
  }

  return model;
}
