import { applySubheaderPolicy } from "../subheader";

describe("templateRender/policies/subheader", () => {
  it("uses existing subheader first for short headers", () => {
    const result = applySubheaderPolicy({
      resolvedParameters: {
        subheader1Text: "AI Line 1",
        subheader2Text: "AI Line 2",
        listingAddress: "123 Main St",
        feature1: "4 beds"
      },
      subcategory: "new_listing",
      headerLength: "short"
    });

    expect(result.subheader1Text).toBe("AI Line 1");
    expect(result.subheader2Text).toBe("AI Line 2");
  });

  it("uses AI-first behavior for medium headers with fallback", () => {
    const result = applySubheaderPolicy({
      resolvedParameters: {
        subheader1Text: "",
        subheader2Text: "",
        listingAddress: "55 Oak Ave",
        feature1: "Pool"
      },
      subcategory: "new_listing",
      headerLength: "medium"
    });

    expect(result.subheader1Text).toBe("55 Oak Ave");
    expect(result.subheader2Text).toBe("Pool");
  });

  it("forces both subheader lines to listing address when enabled", () => {
    const result = applySubheaderPolicy({
      resolvedParameters: {
        subheader1Text: "AI Line 1",
        subheader2Text: "AI Line 2",
        listingAddress: "88 Pine St, Austin, TX",
        feature1: "Pool"
      },
      subcategory: "new_listing",
      headerLength: "medium",
      forceListingAddressSubheader: true
    });

    expect(result.subheader1Text).toBe("88 Pine St, Austin, TX");
    expect(result.subheader2Text).toBe("88 Pine St, Austin, TX");
  });

  it("prioritizes open house date/time for open_house when listing address exists", () => {
    const result = applySubheaderPolicy({
      resolvedParameters: {
        subheader1Text: "AI Line 1",
        subheader2Text: "",
        listingAddress: "55 Oak Ave",
        openHouseDateTime: "Mar 1st, 1-3PM",
        feature1: "Pool"
      },
      subcategory: "open_house",
      headerLength: "medium"
    });

    expect(result.subheader1Text).toBe("Mar 1st, 1-3PM");
    expect(result.subheader2Text).toBe("55 Oak Ave");
  });
});
