import type {
  DBListing,
  DBListingImage,
  DBUserAdditional
} from "@db/types/models";

const mockRenderTemplate = jest.fn();
const mockResolveTemplateParameters = jest.fn();
const mockPickRandomTemplatesForSubcategory = jest.fn();

jest.mock("../providers/orshot", () => ({
  ...jest.requireActual("../providers/orshot"),
  renderTemplate: (...args: unknown[]) => mockRenderTemplate(...args),
  resolveTemplateParameters: (...args: unknown[]) =>
    mockResolveTemplateParameters(...args),
  pickRandomTemplatesForSubcategory: (...args: unknown[]) =>
    mockPickRandomTemplatesForSubcategory(...args)
}));

import {
  renderListingTemplateBatch,
  renderListingTemplateBatchStream
} from "../service";

function buildParams() {
  return {
    userId: "user-1",
    listingId: "listing-1",
    subcategory: "new_listing" as const,
    mediaType: "image" as const,
    listing: { id: "listing-1" } as unknown as DBListing,
    listingImages: [] as DBListingImage[],
    userAdditional: { id: "user-additional-1" } as unknown as DBUserAdditional,
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
        requiredParams: ["headerText", "backgroundImage1"],
        headerLength: "long"
      },
      {
        id: "template-2",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"],
        headerLength: "long"
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
        headerText: "Dream Home"
      }
    });
    expect(result).toMatchObject({
      items: [
        {
          templateId: "template-1",
          imageUrl: "https://cdn.example.com/render-1.jpg",
          captionItemId: "caption-1",
          parametersUsed: {
            headerText: "Dream Home",
            backgroundImage1: "http://localhost:3000/private.jpg",
            headerTextTop: "Dream",
            headerTextBottom: "Home",
            subheader1Text: "",
            subheader2Text: ""
          }
        }
      ],
      failedTemplateIds: ["template-2"]
    });
  });

  it("uses all resolved keys when requiredParams is empty and filters non-public image urls", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-3",
        subcategories: ["new_listing"],
        requiredParams: [],
        headerLength: "long"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "  Heading  ",
      feature1: "  Pool  ",
      backgroundImage1: "ftp://private/asset.jpg",
      listingPrice: "   "
    });
    mockRenderTemplate.mockResolvedValueOnce("https://cdn.example.com/render-3.jpg");

    const result = await renderListingTemplateBatch(buildParams());

    expect(mockRenderTemplate).toHaveBeenCalledWith({
      templateId: "template-3",
      modifications: expect.objectContaining({
        headerText: "Heading",
        headerTextTop: "Heading",
        socialHandleIcon:
          "https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif"
      })
    });
    expect(result.failedTemplateIds).toEqual([]);
    expect(result.items).toHaveLength(1);
  });

  it("processes required params and still renders when image param is filtered", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-4",
        subcategories: ["new_listing"],
        requiredParams: ["backgroundImage1", "headerText"],
        headerLength: "long"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "Public Image",
      backgroundImage1: "https://cdn.example.com/public.jpg"
    });
    mockRenderTemplate.mockResolvedValueOnce("https://cdn.example.com/render-4.jpg");

    await renderListingTemplateBatch(buildParams());

    expect(mockRenderTemplate).toHaveBeenCalledWith({
      templateId: "template-4",
      modifications: {
        headerText: "Public Image"
      }
    });
  });

  it("filters malformed image urls while keeping other required params", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-5",
        subcategories: ["new_listing"],
        requiredParams: ["backgroundImage1", "headerText", "feature1"],
        headerLength: "long"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "Title",
      feature1: "Patio",
      backgroundImage1: "not-a-url"
    });
    mockRenderTemplate.mockResolvedValueOnce("https://cdn.example.com/render-5.jpg");

    await renderListingTemplateBatch(buildParams());

    expect(mockRenderTemplate).toHaveBeenCalledWith({
      templateId: "template-5",
      modifications: {
        headerText: "Title"
      }
    });
  });

  it("prefixes modifications with page1@ for multi-page templates", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-multi-page",
        subcategories: ["new_listing"],
        requiredParams: ["headerText", "feature1"],
        pageLength: 2,
        headerLength: "long"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "Dream Home",
      feature1: "Pool"
    });
    mockRenderTemplate.mockResolvedValueOnce("https://cdn.example.com/render-6.jpg");

    await renderListingTemplateBatch(buildParams());

    expect(mockRenderTemplate).toHaveBeenCalledWith({
      templateId: "template-multi-page",
      modifications: {
        "page1@headerText": "Dream Home"
      }
    });
  });

  it("uses short preset headers when template headerLength is short", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-short-header",
        subcategories: ["new_listing"],
        requiredParams: ["headerText", "subheader1Text", "subheader2Text"],
        headerLength: "short"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "A much longer AI generated headline",
      subheader1Text: "AI Subheader",
      subheader2Text: "AI Secondary",
      listingAddress: "123 Main St"
    });
    mockRenderTemplate.mockResolvedValueOnce("https://cdn.example.com/render-7.jpg");

    await renderListingTemplateBatch({
      ...buildParams(),
      random: () => 0
    });

    expect(mockRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "template-short-header",
        modifications: expect.objectContaining({
          subheader2Text: "AI Secondary"
        })
      })
    );
    const firstCall = mockRenderTemplate.mock.calls[0]?.[0];
    const headerText = firstCall?.modifications?.headerText ?? "";
    expect(typeof headerText).toBe("string");
    expect(headerText.trim().length).toBeGreaterThan(0);
  });

  it("prefers AI subheaders for medium headers and falls back when missing", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-medium-header",
        subcategories: ["new_listing"],
        requiredParams: ["subheader1Text", "subheader2Text"],
        headerLength: "medium"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "Generated headline that can be medium length",
      subheader1Text: "",
      subheader2Text: "",
      listingAddress: "55 Oak Ave",
      feature1: "4 beds"
    });
    mockRenderTemplate.mockResolvedValueOnce("https://cdn.example.com/render-8.jpg");

    await renderListingTemplateBatch({
      ...buildParams(),
      random: () => 0
    });

    expect(mockRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: "template-medium-header",
        modifications: expect.objectContaining({
          subheader2Text: "55 Oak Ave"
        })
      })
    );
    const firstCall = mockRenderTemplate.mock.calls[0]?.[0];
    const subheader1Text = firstCall?.modifications?.subheader1Text ?? "";
    expect(typeof subheader1Text).toBe("string");
    expect(subheader1Text.trim().length).toBeGreaterThan(0);
  });

  it("applies template flags for uppercase headers and address-only subheaders", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-flags",
        subcategories: ["new_listing"],
        requiredParams: ["headerText", "subheader1Text", "subheader2Text"],
        headerLength: "long",
        forceUppercaseHeader: true,
        forceListingAddressSubheader: true
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "welcome home",
      subheader1Text: "AI Subheader",
      subheader2Text: "AI Subheader 2",
      listingAddress: "100 State St, Austin, TX"
    });
    mockRenderTemplate.mockResolvedValueOnce("https://cdn.example.com/render-flags.jpg");

    await renderListingTemplateBatch(buildParams());

    expect(mockRenderTemplate).toHaveBeenCalledWith({
      templateId: "template-flags",
      modifications: {
        headerText: "WELCOME HOME",
        subheader1Text: "100 State St, Austin, TX",
        subheader2Text: "100 State St, Austin, TX"
      }
    });
  });

  it("captures failed template ids when renderer rejects with non-Error value", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-non-error",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"],
        headerLength: "long"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({ headerText: "Hello" });
    mockRenderTemplate.mockRejectedValueOnce("boom");

    const result = await renderListingTemplateBatch(buildParams());

    expect(result.items).toEqual([]);
    expect(result.failedTemplateIds).toEqual(["template-non-error"]);
  });

  it("fills failed slot with fallback item when listing images exist", async () => {
    const listingImages: DBListingImage[] = [
      {
        id: "img-1",
        listingId: "listing-1",
        filename: "photo.jpg",
        url: "https://cdn.example.com/photo.jpg",
        category: "kitchen",
        confidence: null,
        primaryScore: 0.8,
        isPrimary: true,
        metadata: null,
        uploadedAt: new Date(2000)
      } as DBListingImage
    ];
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-1",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"],
        headerLength: "long"
      },
      {
        id: "template-2",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"],
        headerLength: "long"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({ headerText: "Dream Home" });
    mockRenderTemplate
      .mockResolvedValueOnce("https://cdn.example.com/render-1.jpg")
      .mockRejectedValueOnce(new Error("render failed"));

    const result = await renderListingTemplateBatch({
      ...buildParams(),
      listingImages,
      captionItems: [
        { id: "caption-1", hook: "H1", caption: "C1", body: [] },
        { id: "caption-2", hook: "H2", caption: "C2", body: [] }
      ]
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      templateId: "template-1",
      imageUrl: "https://cdn.example.com/render-1.jpg",
      captionItemId: "caption-1"
    });
    expect(result.items[0].isFallback).toBeFalsy();
    expect(result.items[1]).toMatchObject({
      templateId: "fallback",
      imageUrl: "https://cdn.example.com/photo.jpg",
      captionItemId: "caption-2",
      isFallback: true
    });
    expect(result.failedTemplateIds).toEqual(["template-2"]);
  });

  it("stream: calls onItem with fallback when primary fails and listing images exist", async () => {
    const listingImages: DBListingImage[] = [
      {
        id: "img-1",
        listingId: "listing-1",
        filename: "photo.jpg",
        url: "https://cdn.example.com/photo.jpg",
        category: null,
        confidence: null,
        primaryScore: null,
        isPrimary: false,
        metadata: null,
        uploadedAt: new Date()
      } as DBListingImage
    ];
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-a",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"],
        headerLength: "long"
      },
      {
        id: "template-b",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"],
        headerLength: "long"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({ headerText: "Hi" });
    mockRenderTemplate
      .mockResolvedValueOnce("https://cdn.example.com/stream-1.jpg")
      .mockRejectedValueOnce(new Error("stream render failed"));

    const onItem = jest.fn().mockResolvedValue(undefined);

    const result = await renderListingTemplateBatchStream(
      {
        ...buildParams(),
        listingImages,
        captionItems: [
          { id: "cap-1", hook: "H1", caption: "C1", body: [] },
          { id: "cap-2", hook: "H2", caption: "C2", body: [] }
        ]
      },
      { onItem }
    );

    expect(onItem).toHaveBeenCalledTimes(2);
    expect(onItem).toHaveBeenNthCalledWith(1, {
      templateId: "template-a",
      imageUrl: "https://cdn.example.com/stream-1.jpg",
      captionItemId: "cap-1",
      parametersUsed: {
        agentContactInfo: "",
        agentContact1: "",
        agentContact2: "",
        agentContact3: "",
        bedCount: "",
        bathCount: "",
        garageCount: "",
        squareFootage: "",
        listingAddress: "",
        feature1: "",
        feature2: "",
        feature3: "",
        featureList: "",
        headerText: "Hi",
        headerTextTop: "Hi",
        headerTextBottom: "",
        garageLabel: "",
        socialHandleIcon:
          "https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif",
        subheader1Text: "",
        subheader2Text: ""
      }
    });
    expect(onItem).toHaveBeenNthCalledWith(2, {
      templateId: "fallback",
      imageUrl: "https://cdn.example.com/photo.jpg",
      captionItemId: "cap-2",
      parametersUsed: {},
      isFallback: true
    });
    expect(result.failedTemplateIds).toEqual(["template-b"]);
  });

  it("passes listing image URLs through to parameter resolver", async () => {
    const signedUrl = "https://storage.example.com/bucket/user_1/signed-photo.jpg?X-Amz-Signature=abc";
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-public",
        subcategories: ["new_listing"],
        requiredParams: ["headerText", "backgroundImage1"],
        headerLength: "long"
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "Dream Home",
      backgroundImage1: signedUrl
    });
    mockRenderTemplate.mockResolvedValueOnce("https://cdn.example.com/render.jpg");

    const listingImages: DBListingImage[] = [
      {
        id: "img-1",
        listingId: "listing-1",
        filename: "photo.jpg",
        url: signedUrl,
        category: "kitchen",
        confidence: null,
        primaryScore: null,
        isPrimary: true,
        metadata: null,
        uploadedAt: new Date()
      } as DBListingImage
    ];

    await renderListingTemplateBatch({
      ...buildParams(),
      listingImages
    });

    expect(mockResolveTemplateParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        listingImages: [
          expect.objectContaining({
            ...listingImages[0]
          })
        ]
      })
    );
  });
});
