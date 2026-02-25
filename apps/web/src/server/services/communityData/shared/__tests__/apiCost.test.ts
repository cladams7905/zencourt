import {
  estimateGoogleCallsCostUsd,
  GOOGLE_CALL_ESTIMATED_COST_USD
} from "../apiCost";

describe("communityData apiCost", () => {
  it("uses configured per-call cost", () => {
    expect(GOOGLE_CALL_ESTIMATED_COST_USD).toBeGreaterThan(0);
  });

  it("calculates and rounds google call costs", () => {
    expect(estimateGoogleCallsCostUsd(0)).toBe(0);
    expect(estimateGoogleCallsCostUsd(1)).toBe(0.0219);
    expect(estimateGoogleCallsCostUsd(3)).toBe(0.0656);
  });
});
