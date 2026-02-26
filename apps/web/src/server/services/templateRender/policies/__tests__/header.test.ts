import { applyHeaderPolicy } from "../header";

describe("templateRender/policies/header", () => {
  it("uses a short preset header and computes split fields", () => {
    const result = applyHeaderPolicy({
      resolvedParameters: {
        headerText: "Some long generated header"
      },
      headerLength: "short",
      subcategory: "new_listing",
      random: () => 0
    });

    expect(result.headerText).toBe("Just Listed");
    expect(result.headerTextTop).toBe("Just");
    expect(result.headerTextBottom).toBe("Listed");
  });

  it("truncates medium headers to 5 words", () => {
    const result = applyHeaderPolicy({
      resolvedParameters: {
        headerText: "This is a very long generated headline"
      },
      headerLength: "medium",
      subcategory: "new_listing"
    });

    expect(result.headerText).toBe("This is a very long");
  });

  it("falls back to short presets when header is empty", () => {
    const result = applyHeaderPolicy({
      resolvedParameters: {},
      headerLength: "long",
      subcategory: "unknown_subcategory" as never,
      random: () => 0
    });

    expect(result.headerText).toBe("Featured Listing");
    expect(result.headerTextTop).toBe("Featured");
    expect(result.headerTextBottom).toBe("Listing");
  });
});
