import { getHeaderHooks } from "../hookCatalog";

describe("templateRender/policies/hookCatalog", () => {
  it("loads short hooks for new_listing", () => {
    const hooks = getHeaderHooks({
      subcategory: "new_listing",
      headerLength: "short"
    });

    expect(hooks.length).toBeGreaterThan(0);
    expect(hooks[0]?.header).toBe("Just listed.");
  });

  it("parses em dash tails into subheaders for medium hooks", () => {
    const hooks = getHeaderHooks({
      subcategory: "new_listing",
      headerLength: "medium"
    });

    expect(hooks[0]?.header).toBe("Just listed");
    expect(hooks[0]?.subheader).toBe("come see it.");
  });
});
