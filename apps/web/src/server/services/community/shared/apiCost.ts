export const GOOGLE_CALL_ESTIMATED_COST_USD = 0.02187;

export function estimateGoogleCallsCostUsd(totalCalls: number): number {
  return Number((totalCalls * GOOGLE_CALL_ESTIMATED_COST_USD).toFixed(4));
}
