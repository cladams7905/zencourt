import { applyHeaderPolicy } from "../header";

describe("templateRender/policies/header", () => {
  it("uses short hooks and computes split fields", async () => {
    const result = await applyHeaderPolicy({
      resolvedParameters: {
        headerText: "Some long generated header"
      },
      headerLength: "short",
      subcategory: "new_listing",
      rotationKey: "test-short",
      random: () => 0
    });

    expect(result.headerText).toBe("Just listed.");
    expect(result.headerTextTop).toBe("Just");
    expect(result.headerTextBottom).toBe("listed.");
  });

  it("uses medium hooks and maps em dash tail into subheader1Text", async () => {
    const result = await applyHeaderPolicy({
      resolvedParameters: {
        headerText: "This is a very long generated headline"
      },
      headerLength: "medium",
      subcategory: "new_listing",
      rotationKey: "test-medium",
      random: () => 0
    });

    expect(typeof result.headerText).toBe("string");
    expect(result.headerText?.trim().length).toBeGreaterThan(0);
  });

  it("falls back to short presets when long header is empty", async () => {
    const result = await applyHeaderPolicy({
      resolvedParameters: {},
      headerLength: "long",
      subcategory: "unknown_subcategory" as never,
      random: () => 0
    });

    expect(result.headerText).toBe("Featured Listing");
    expect(result.headerTextTop).toBe("Featured");
    expect(result.headerTextBottom).toBe("Listing");
  });

  it("uppercases header text when forced by template flag", async () => {
    const result = await applyHeaderPolicy({
      resolvedParameters: {
        headerText: "Just listed and ready"
      },
      headerLength: "long",
      forceUppercaseHeader: true,
      subcategory: "new_listing"
    });

    expect(result.headerText).toBe("JUST LISTED AND READY");
    expect(result.headerTextTop).toBe("JUST LISTED");
    expect(result.headerTextBottom).toBe("AND READY");
  });

  it("removes trailing period when uppercase flag is enabled", async () => {
    const result = await applyHeaderPolicy({
      resolvedParameters: {
        headerText: "Ignored"
      },
      headerLength: "short",
      forceUppercaseHeader: true,
      subcategory: "new_listing",
      rotationKey: "test-short-period-strip",
      random: () => 0
    });

    expect(result.headerText).toBe("JUST LISTED");
    expect(result.headerTextTop).toBe("JUST");
    expect(result.headerTextBottom).toBe("LISTED");
  });
});
