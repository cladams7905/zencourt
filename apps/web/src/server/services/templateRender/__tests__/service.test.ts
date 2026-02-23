import type {
  DBListing,
  DBListingImage,
  DBUserAdditional
} from "@db/types/models";

const mockRenderTemplate = jest.fn();
const mockResolveTemplateParameters = jest.fn();
const mockPickRandomTemplatesForSubcategory = jest.fn();
const mockGetPublicUrlForStorageUrl = jest.fn();

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    getPublicUrlForStorageUrl: (...args: unknown[]) =>
      mockGetPublicUrlForStorageUrl(...args),
    hasPublicBaseUrl: () => true
  }
}));

jest.mock("../cache", () => ({
  buildTemplateRenderCacheKey: jest.fn().mockReturnValue("mock-key"),
  getCachedTemplateRender: jest.fn().mockResolvedValue(null),
  setCachedTemplateRender: jest.fn().mockResolvedValue(undefined),
  cachedToRenderedItem: jest.fn().mockImplementation((c: { templateId: string; imageUrl: string; captionItemId: string }) => ({
    templateId: c.templateId,
    imageUrl: c.imageUrl,
    captionItemId: c.captionItemId,
    parametersUsed: {}
  }))
}));

jest.mock("../providers/orshot", () => ({
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
    subcategory: "new_listing" as const,
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
    mockGetPublicUrlForStorageUrl.mockImplementation((url: string) =>
      url.includes("signed") ? url.replace("signed", "cdn-public") : null
    );
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

  it("uses all resolved keys when requiredParams is empty and filters non-public image urls", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-3",
        subcategories: ["new_listing"],
        requiredParams: []
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
      modifications: {
        headerText: "Heading",
        "heading:headerText": "Heading",
        feature1: "Pool",
        "heading:feature1": "Pool"
      }
    });
    expect(result.failedTemplateIds).toEqual([]);
    expect(result.items).toHaveLength(1);
  });

  it("processes required params and still renders when image param is filtered", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-4",
        subcategories: ["new_listing"],
        requiredParams: ["backgroundImage1", "headerText"]
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
        headerText: "Public Image",
        "heading:headerText": "Public Image"
      }
    });
  });

  it("filters malformed image urls while keeping other required params", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-5",
        subcategories: ["new_listing"],
        requiredParams: ["backgroundImage1", "headerText", "feature1"]
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
        headerText: "Title",
        "heading:headerText": "Title",
        feature1: "Patio",
        "heading:feature1": "Patio"
      }
    });
  });

  it("captures failed template ids when renderer rejects with non-Error value", async () => {
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-non-error",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"]
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
        requiredParams: ["headerText"]
      },
      {
        id: "template-2",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"]
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
        requiredParams: ["headerText"]
      },
      {
        id: "template-b",
        subcategories: ["new_listing"],
        requiredParams: ["headerText"]
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
        listingId: "listing-1",
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
      parametersUsed: { headerText: "Hi" }
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

  it("transforms listing image URLs to public CDN URLs when storage service returns them", async () => {
    const signedUrl = "https://storage.example.com/bucket/user_1/signed-photo.jpg?X-Amz-Signature=abc";
    const publicUrl = "https://cdn.example.com/bucket/user_1/photo.jpg";
    mockGetPublicUrlForStorageUrl.mockReturnValue(publicUrl);
    mockPickRandomTemplatesForSubcategory.mockReturnValue([
      {
        id: "template-public",
        subcategories: ["new_listing"],
        requiredParams: ["headerText", "backgroundImage1"]
      }
    ]);
    mockResolveTemplateParameters.mockReturnValue({
      headerText: "Dream Home",
      backgroundImage1: publicUrl
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

    expect(mockGetPublicUrlForStorageUrl).toHaveBeenCalledWith(signedUrl);
    expect(mockResolveTemplateParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        listingImages: [
          expect.objectContaining({
            ...listingImages[0],
            url: publicUrl
          })
        ]
      })
    );
  });
});
