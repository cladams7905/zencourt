import { applyPropertyDescriptionPolicy } from "../propertyDescription";

describe("templateRender/policies/propertyDescription", () => {
  it("builds deterministic description from property details and address", () => {
    const result = applyPropertyDescriptionPolicy({
      resolvedParameters: {
        listingAddress: "123 Main St, Austin, TX"
      },
      details: {
        bedrooms: 4,
        bathrooms: 3,
        architecture: "Modern",
        living_area_sq_ft: 2500
      }
    });

    expect(result.propertyDescription).toBe(
      "Come see this 4-bed, 3-bath, Modern home located at 123 Main St in Austin."
    );
  });

  it("falls back gracefully when details are sparse", () => {
    const result = applyPropertyDescriptionPolicy({
      resolvedParameters: {},
      details: null
    });

    expect(result.propertyDescription).toBe(
      "Come see this beautiful home."
    );
  });
});
