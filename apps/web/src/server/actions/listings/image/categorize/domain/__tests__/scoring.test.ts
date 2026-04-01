import {
  calculateAspectRatioScore,
  calculateRecommendationBreakdown,
  calculateResolutionScore
} from "../scoring";

describe("image categorize scoring", () => {
  it("returns zero resolution score for missing or invalid dimensions", () => {
    expect(calculateResolutionScore()).toBe(0);
    expect(
      calculateResolutionScore({
        width: 0,
        height: 720
      } as never)
    ).toBe(0);
  });

  it("scales low-resolution images more aggressively below half target size", () => {
    expect(
      calculateResolutionScore({
        width: 640,
        height: 360
      } as never)
    ).toBe(0.25);

    expect(
      calculateResolutionScore({
        width: 960,
        height: 540
      } as never)
    ).toBe(0.75);

    expect(
      calculateResolutionScore({
        width: 2560,
        height: 1440
      } as never)
    ).toBe(1);
  });

  it("returns zero aspect ratio score for invalid dimensions and clamps far-off ratios", () => {
    expect(calculateAspectRatioScore()).toBe(0);
    expect(
      calculateAspectRatioScore({
        width: 100,
        height: 0
      } as never)
    ).toBe(0);
    expect(
      calculateAspectRatioScore({
        width: 100,
        height: 1000
      } as never)
    ).toBe(0.0563);
  });

  it("calculates recommendation breakdown using detail-specific storytelling inputs", () => {
    const breakdown = calculateRecommendationBreakdown({
      metadata: {
        width: 1280,
        height: 720
      } as never,
      scores: {
        lighting: 0.8,
        framing: 0.7,
        coverage: 0.9,
        clarity: 1,
        motionPotential: 0.6,
        featureAppeal: 0.75
      } as never,
      shotType: "detail",
      confidence: 0.9
    });

    expect(breakdown).toEqual(
      expect.objectContaining({
        resolution: 1,
        aspectRatio: 1,
        technical: 1,
        composition: 0.85,
        storytelling: 0.75,
        total: 0.8575
      })
    );
  });

  it("falls back to room representativeness for non-detail shots", () => {
    const breakdown = calculateRecommendationBreakdown({
      metadata: {
        width: 960,
        height: 540
      } as never,
      scores: {
        lighting: 0.7,
        framing: 0.8,
        coverage: 0.6,
        clarity: 0.9,
        motionPotential: 0.5,
        roomRepresentativeness: 0.4
      } as never,
      shotType: "wide",
      confidence: 0.8
    });

    expect(breakdown.storytelling).toBe(0.5667);
    expect(breakdown.total).toBe(0.7263);
  });
});
