import type { ProcessingResult } from "@web/src/server/services/imageProcessor";

export type VisionActionOptions = {
  aiConcurrency?: number;
};

export type VisionStats = ProcessingResult["stats"];

export function buildNoopStats(uploaded: number, analyzed: number): VisionStats {
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
