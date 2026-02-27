import { buildModifications } from "../modifications";

describe("templateRender/providers/orshot/modifications", () => {
  it("builds raw-key modifications for required params", () => {
    const result = buildModifications({
      resolvedParameters: {
        headerText: "  Dream Home  ",
        feature1: "  Pool  "
      },
      template: {
        id: "template-1",
        name: "Template 1",
        subcategories: ["new_listing"],
        requiredParams: ["headerText", "feature1"]
      }
    });

    expect(result).toEqual({
      headerText: "Dream Home",
      feature1: "Pool"
    });
  });

  it("prefixes keys with page1@ when template has multiple pages", () => {
    const result = buildModifications({
      resolvedParameters: {
        headerText: "Title"
      },
      template: {
        id: "template-2",
        name: "Template 2",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"],
        pageLength: 2
      }
    });

    expect(result).toEqual({
      "page1@headerText": "Title"
    });
  });

  it("filters non-public image URLs", () => {
    const result = buildModifications({
      resolvedParameters: {
        backgroundImage1: "http://localhost:3000/private.jpg",
        feature1: "Patio"
      },
      template: {
        id: "template-3",
        name: "Template 3",
        subcategories: ["new_listing"],
        requiredParams: ["backgroundImage1", "feature1"]
      }
    });

    expect(result).toEqual({
      feature1: "Patio"
    });
  });

  it("skips socialHandleIcon when empty", () => {
    const result = buildModifications({
      resolvedParameters: {
        socialHandleIcon: ""
      },
      template: {
        id: "template-4",
        name: "Template 4",
        subcategories: ["new_listing"],
        requiredParams: ["socialHandleIcon"]
      }
    });

    expect(result).toEqual({});
  });

  it("keeps socialHandleIcon when present", () => {
    const result = buildModifications({
      resolvedParameters: {
        socialHandleIcon: "https://cdn.orshot.com/elements/icons/logos/instagram.svg"
      },
      template: {
        id: "template-5",
        name: "Template 5",
        subcategories: ["new_listing"],
        requiredParams: ["socialHandleIcon"]
      }
    });

    expect(result).toEqual({
      socialHandleIcon: "https://cdn.orshot.com/elements/icons/logos/instagram.svg"
    });
  });
});
