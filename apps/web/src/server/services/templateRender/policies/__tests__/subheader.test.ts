import { applySubheaderPolicy } from "../subheader";

describe("templateRender/policies/subheader", () => {
  it("uses address-first behavior for short headers", () => {
    const result = applySubheaderPolicy({
      resolvedParameters: {
        subheader1Text: "AI Line 1",
        subheader2Text: "AI Line 2",
        listingAddress: "123 Main St",
        feature1: "4 beds"
      },
      headerLength: "short"
    });

    expect(result.subheader1Text).toBe("123 Main St");
    expect(result.subheader2Text).toBe("AI Line 1");
  });

  it("uses AI-first behavior for medium headers with fallback", () => {
    const result = applySubheaderPolicy({
      resolvedParameters: {
        subheader1Text: "",
        subheader2Text: "",
        listingAddress: "55 Oak Ave",
        feature1: "Pool"
      },
      headerLength: "medium"
    });

    expect(result.subheader1Text).toBe("55 Oak Ave");
    expect(result.subheader2Text).toBe("Pool");
  });
});
