import type { CategorizationResult } from "@web/src/server/services/imageCategorization";

export type VisionActionOptions = {
  aiConcurrency?: number;
};

export type VisionStats = CategorizationResult["stats"];

export function buildNoopStats(
  uploaded: number,
  analyzed: number
): VisionStats {
  return {
    total: 0,
    uploaded,
    analyzed,
    failed: 0,
    successRate: 100,
    avgConfidence: 0,
    totalDuration: 0
  };
}
