import { getHeaderHooks } from "../hookCatalog";

describe("templateRender/policies/hookCatalog", () => {
  it("loads short hooks for new_listing with header and subheader shape", () => {
    const hooks = getHeaderHooks({
      subcategory: "new_listing",
      headerLength: "short"
    });

    expect(hooks.length).toBeGreaterThan(0);
    for (const hook of hooks) {
      expect(hook).toHaveProperty("header");
      expect(hook).toHaveProperty("subheader");
      expect(typeof hook.header).toBe("string");
      expect(typeof hook.subheader).toBe("string");
      expect(hook.header.trim().length).toBeGreaterThan(0);
    }
  });

  it("parses em dash into header and subheader for medium hooks", () => {
    const hooks = getHeaderHooks({
      subcategory: "new_listing",
      headerLength: "medium"
    });

    expect(hooks.length).toBeGreaterThan(0);
    const withSubheader = hooks.filter((h) => h.subheader.trim().length > 0);
    expect(withSubheader.length).toBeGreaterThan(0);
    for (const hook of withSubheader) {
      expect(hook.header.trim().length).toBeGreaterThan(0);
      expect(hook.subheader.trim().length).toBeGreaterThan(0);
    }
  });
});
