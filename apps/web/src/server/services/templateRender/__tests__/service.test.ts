const mockRenderTemplate = jest.fn();
const mockResolveTemplateParameters = jest.fn();
const mockPickRandomTemplatesForSubcategory = jest.fn();

jest.mock("../providers/orshot", () => ({
  renderTemplate: (...args: unknown[]) => mockRenderTemplate(...args),
  resolveTemplateParameters: (...args: unknown[]) =>
    mockResolveTemplateParameters(...args),
  pickRandomTemplatesForSubcategory: (...args: unknown[]) =>
    mockPickRandomTemplatesForSubcategory(...args)
}));

import { renderListingTemplateBatch } from "../service";

function buildParams() {
  return {
    subcategory: "new_listing" as const,
    listing: { id: "listing-1" },
    listingImages: [],
    userAdditional: { id: "user-additional-1" },
    captionItems: [
      {
        id: "caption-1",
        hook: "Dream Home",
        caption: "Caption",
        body: []
      }
    ]
  };
}

describe("templateRender/service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty result when caption items are empty", async () => {
    const base = buildParams();

    await expect(
      renderListingTemplateBatch({
        ...base,
        captionItems: []
      })
    ).resolves.toEqual({ items: [], failedTemplateIds: [] });
  });

  it("returns empty result when no templates are selected", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([]);

    await expect(renderListingTemplateBatch(buildParams())).resolves.toEqual({
      items: [],
      failedTemplateIds: []
    });
  });

  it("renders templates and records failed template ids", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-1",
        subcategories: ["new_listing"],
        requiredParams: ["headerText", "backgroundImage1"]
      },
      {
        id: "template-2",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"]
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "Dream Home",
      backgroundImage1: "http://localhost:3000/private.jpg"
    });
    mockRenderTemplate
      .mockResolvedValueOnce("https://cdn.example.com/render-1.jpg")
      .mockRejectedValueOnce(new Error("render failed"));

    const result = await renderListingTemplateBatch(buildParams());

    expect(mockRenderTemplate).toHaveBeenNthCalledWith(1, {
      templateId: "template-1",
      modifications: {
        headerText: "Dream Home",
        "heading:headerText": "Dream Home"
      }
    });
    expect(result).toEqual({
      items: [
        {
          templateId: "template-1",
          imageUrl: "https://cdn.example.com/render-1.jpg",
          captionItemId: "caption-1",
          parametersUsed: {
            headerText: "Dream Home",
            backgroundImage1: "http://localhost:3000/private.jpg"
          }
        }
      ],
      failedTemplateIds: ["template-2"]
    });
  });
});
