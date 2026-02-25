import type { CategorizationResult } from "./domain/types";

export type ImageCategorizationActionOptions = {
  aiConcurrency?: number;
};

export type ImageCategorizationStats = CategorizationResult["stats"];

export function buildNoopStats(
  uploaded: number,
  analyzed: number
): ImageCategorizationStats {
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
