import { buildOrshotModifications } from "../modifications";

describe("templateRender/providers/orshot/modifications", () => {
  it("builds raw-key modifications for required params", () => {
    const result = buildOrshotModifications({
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
    const result = buildOrshotModifications({
      resolvedParameters: {
        headerText: "Title"
      },
      template: {
        id: "template-2",
        name: "Template 2",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"],
        page_length: 2
      }
    });

    expect(result).toEqual({
      "page1@headerText": "Title"
    });
  });

  it("filters non-public image URLs", () => {
    const result = buildOrshotModifications({
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
});
