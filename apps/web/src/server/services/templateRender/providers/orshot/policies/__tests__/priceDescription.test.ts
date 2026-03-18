import { applyPriceDescriptionPolicy } from "../priceDescription";

describe("templateRender/policies/priceDescription", () => {
  it("concatenates priceLabel and listingPrice", () => {
    const result = applyPriceDescriptionPolicy({
      resolvedParameters: {
        priceLabel: "starting from",
        listingPrice: "$750,000"
      }
    });

    expect(result.priceDescription).toBe("starting from $750,000");
  });

  it("returns empty string when both values are missing", () => {
    const result = applyPriceDescriptionPolicy({
      resolvedParameters: {}
    });

    expect(result.priceDescription).toBe("");
  });
});
