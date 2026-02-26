import { applyFeaturePolicy } from "../feature";

describe("templateRender/policies/feature", () => {
  it("builds constrained feature fields and featureList", () => {
    const result = applyFeaturePolicy({
      resolvedParameters: {},
      details: {
        bedrooms: 4,
        bathrooms: 3,
        living_area_sq_ft: 2500,
        living_spaces: ["Great Room"],
        additional_spaces: ["Office"],
        architecture: "Modern"
      }
    });

    expect(result.bedCount).toBe("4 beds");
    expect(result.bathCount).toBe("3 baths");
    expect(result.squareFootage).toBe("2,500 sqft");
    expect(result.featureList).toBe("4 beds, 3 baths, 2,500 sq. ft.");
    expect(result.featureList).not.toContain("Great Room");
  });
});
