import { resolveTemplateParameters } from "../parameters";
import { createInMemoryTemplateImageRotationStore } from "../../../rotation";

jest.mock("@shared/utils", () => ({
  PREVIEW_TEXT_OVERLAY_ARROW_PATHS: ["/overlays/a.svg", "/overlays/b.svg"],
  buildStoragePublicUrl: (endpoint: string, bucket: string, key: string) =>
    `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}`,
  isPriorityCategory: jest.fn().mockReturnValue(false)
}));

describe("templateRender/providers/orshot/parameters", () => {
  const originalStoragePublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
  const originalB2Endpoint = process.env.B2_ENDPOINT;
  const originalBucketName = process.env.B2_BUCKET_NAME;

  const listingBase = {
    id: "listing-1",
    title: "Title fallback",
    address: "123 Listing Address",
    propertyDetails: {
      address: "123 Main St",
      bedrooms: 4,
      bathrooms: 3,
      living_area_sq_ft: 2500,
      listing_price: 750000,
      open_house_events: [
        { date: "2026-03-01", start_time: "13:00", end_time: "15:00" }
      ],
      living_spaces: ["Great Room"],
      additional_spaces: ["Office"],
      architecture: "Modern"
    }
  };

  const captionItem = {
    id: "caption-1",
    hook: "Stunning modern home",
    caption: "Great flow and natural light",
    body: [
      { header: "Headline A", content: "Body A" },
      { header: "Headline B", content: "Body B" }
    ]
  };

  const listingImages = [
    {
      id: "img-1",
      url: "https://cdn.example.com/1.jpg",
      category: "kitchen",
      isPrimary: true,
      primaryScore: 0.8,
      uploadedAt: new Date("2026-02-18T00:00:00.000Z")
    },
    {
      id: "img-2",
      url: "https://cdn.example.com/2.jpg",
      category: "bedroom",
      isPrimary: false,
      primaryScore: 0.7,
      uploadedAt: new Date("2026-02-17T00:00:00.000Z")
    }
  ];

  const userAdditional = {
    agentName: "Agent Jane",
    agentTitle: "Realtor",
    brokerageName: "Acme Realty",
    headshotUrl: "https://cdn.example.com/headshot.jpg"
  };

  beforeEach(() => {
    delete process.env.STORAGE_PUBLIC_BASE_URL;
    delete process.env.B2_ENDPOINT;
    delete process.env.B2_BUCKET_NAME;
  });

  afterAll(() => {
    if (typeof originalStoragePublicBaseUrl === "string") {
      process.env.STORAGE_PUBLIC_BASE_URL = originalStoragePublicBaseUrl;
    } else {
      delete process.env.STORAGE_PUBLIC_BASE_URL;
    }

    if (typeof originalB2Endpoint === "string") {
      process.env.B2_ENDPOINT = originalB2Endpoint;
    } else {
      delete process.env.B2_ENDPOINT;
    }

    if (typeof originalBucketName === "string") {
      process.env.B2_BUCKET_NAME = originalBucketName;
    } else {
      delete process.env.B2_BUCKET_NAME;
    }
  });

  it("builds parameter map for new listings", () => {
    process.env.STORAGE_PUBLIC_BASE_URL = "https://cdn.example.com";
    process.env.B2_BUCKET_NAME = "zencourt-media-dev";

    const result = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: listingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      random: () => 0,
      now: new Date("2026-02-21T00:00:00.000Z")
    });

    expect(result.headerTag).toBe("listed");
    expect(result.headerTextTop).toBe("Stunning modern");
    expect(result.headerTextBottom).toBe("home");
    expect(result.priceLabel).toBe("starting from");
    expect(result.listingPrice).toBe("$750,000");
    expect(result.squareFootage).toBe("2,500 sqft");
    expect(result.beds).toBe("4 beds");
    expect(result.baths).toBe("3 baths");
    expect(result.sqft).toBe("2,500 sq. ft.");
    expect(result.bedCount).toBe("4");
    expect(result.bathCount).toBe("3");
    expect(result.garageCount).toBe("");
    expect(result.arrowImage).toBe(
      "https://cdn.example.com/zencourt-media-dev/assets/arrows/a.svg"
    );
    expect(result.featureList).toContain("4 beds");
    expect(result.featureList).toContain("3 baths");
    expect(result.agentName).toBe("Agent Jane");
    expect(result.agentProfileImage).toBe("https://cdn.example.com/headshot.jpg");
    expect(result.backgroundImage1).toBe("https://cdn.example.com/1.jpg");
    expect(result.openHouseDateTime).toBe("");
  });

  it("populates open house date/time from listing schedule for open_house", () => {
    const result = resolveTemplateParameters({
      subcategory: "open_house",
      listing: listingBase as never,
      listingImages: listingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      now: new Date("2026-02-21T00:00:00.000Z")
    });

    expect(result.openHouseDateTime).toBe("Mar 1st, 1-3PM");
  });

  it("uses sold label for status updates and falls back values", () => {
    const result = resolveTemplateParameters({
      subcategory: "status_update",
      listing: {
        ...listingBase,
        propertyDetails: null
      } as never,
      listingImages: [] as never,
      userAdditional: {} as never,
      captionItem: {
        ...captionItem,
        hook: null
      },
      random: () => 0.5,
      now: new Date("2026-02-22T00:00:00.000Z")
    });

    expect(result.headerTag).toBe("sold");
    expect(result.priceLabel).toBe("sold for");
    expect(result.headerText).toBe("Just listed");
    expect(result.listingAddress).toBe("123 Listing Address");
    expect(result.agentName).toBe("");
    expect(result.socialHandle).toBe("@zencourt_test2");
    expect(result.agentContactInfo).toBe("");
    expect(result.backgroundImage1).toBe("");
    expect(result.openHouseDateTime).toBe("");
  });

  it("uses default header tag for non listing/status subcategories and single-word header splitting", () => {
    const result = resolveTemplateParameters({
      subcategory: "community" as never,
      listing: {
        ...listingBase,
        propertyDetails: {
          address: "123 Main St"
        }
      } as never,
      listingImages: [] as never,
      userAdditional: {
        agentName: "  ",
        agentTitle: "",
        brokerageName: "",
        headshotUrl: ""
      } as never,
      captionItem: {
        ...captionItem,
        hook: "Hello"
      },
      random: () => 0.1
    });

    expect(result.headerTag).toBe("");
    expect(result.headerTextTop).toBe("Hello");
    expect(result.headerTextBottom).toBe("");
    expect(result.agentName).toBe("");
  });

  it("falls back to B2 endpoint when storage public base url is missing", () => {
    process.env.B2_ENDPOINT = "https://s3.us-west-002.backblazeb2.com";
    process.env.B2_BUCKET_NAME = "zencourt-media-dev";

    const result = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: listingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      random: () => 0
    });

    expect(result.arrowImage).toBe(
      "https://s3.us-west-002.backblazeb2.com/zencourt-media-dev/assets/arrows/a.svg"
    );
  });

  it("prefers storage public base url over raw B2 endpoint", () => {
    process.env.STORAGE_PUBLIC_BASE_URL = "https://cdn.example.com";
    process.env.B2_ENDPOINT = "https://s3.us-west-002.backblazeb2.com";
    process.env.B2_BUCKET_NAME = "zencourt-media-dev";

    const result = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: listingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      random: () => 0
    });

    expect(result.arrowImage).toBe(
      "https://cdn.example.com/zencourt-media-dev/assets/arrows/a.svg"
    );
  });

  it("returns empty arrow image when no valid storage public url is available", () => {
    const result = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: listingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      random: () => 0
    });

    expect(result.arrowImage).toBe("");
  });

  it("rotates primary images per render index", () => {
    const rotatingImages = [
      ...listingImages,
      {
        id: "img-3",
        url: "https://cdn.example.com/3.jpg",
        category: "living room",
        isPrimary: true,
        primaryScore: 0.6,
        uploadedAt: new Date("2026-02-16T00:00:00.000Z")
      }
    ];

    const first = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: rotatingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      renderIndex: 0
    });

    const second = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: rotatingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      renderIndex: 1
    });

    expect(first.backgroundImage1).toBe("https://cdn.example.com/1.jpg");
    expect(second.backgroundImage1).toBe("https://cdn.example.com/3.jpg");
  });

  it("prefers primary images before non-primary images", () => {
    const mixedImages = [
      {
        id: "img-a",
        url: "https://cdn.example.com/non-primary.jpg",
        category: "kitchen",
        isPrimary: false,
        primaryScore: 0.99,
        uploadedAt: new Date("2026-02-19T00:00:00.000Z")
      },
      {
        id: "img-b",
        url: "https://cdn.example.com/primary.jpg",
        category: "bedroom",
        isPrimary: true,
        primaryScore: 0.1,
        uploadedAt: new Date("2026-02-18T00:00:00.000Z")
      }
    ];

    const result = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: mixedImages as never,
      userAdditional: userAdditional as never,
      captionItem
    });

    expect(result.backgroundImage1).toBe("https://cdn.example.com/primary.jpg");
    expect(result.backgroundImage1).not.toBe("https://cdn.example.com/non-primary.jpg");
  });

  it("backfills extra background slots with non-primary images when primaries run out", () => {
    const mixedImages = [
      {
        id: "img-a",
        url: "https://cdn.example.com/primary-1.jpg",
        category: "kitchen",
        isPrimary: true,
        primaryScore: 0.9,
        uploadedAt: new Date("2026-02-19T00:00:00.000Z")
      },
      {
        id: "img-b",
        url: "https://cdn.example.com/primary-2.jpg",
        category: "living room",
        isPrimary: true,
        primaryScore: 0.8,
        uploadedAt: new Date("2026-02-18T00:00:00.000Z")
      },
      {
        id: "img-c",
        url: "https://cdn.example.com/non-primary-1.jpg",
        category: "bedroom",
        isPrimary: false,
        primaryScore: 0.7,
        uploadedAt: new Date("2026-02-17T00:00:00.000Z")
      }
    ];

    const result = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: mixedImages as never,
      userAdditional: userAdditional as never,
      captionItem
    });

    expect(result.backgroundImage1).toBe("https://cdn.example.com/primary-1.jpg");
    expect(result.backgroundImage2).toBe("https://cdn.example.com/primary-2.jpg");
    expect(result.backgroundImage3).toBe(
      "https://cdn.example.com/non-primary-1.jpg"
    );
  });

  it("rotates across repeated renders with the same rotation key", () => {
    const rotatingImages = [
      ...listingImages,
      {
        id: "img-3",
        url: "https://cdn.example.com/3.jpg",
        category: "living room",
        isPrimary: true,
        primaryScore: 0.6,
        uploadedAt: new Date("2026-02-16T00:00:00.000Z")
      }
    ];

    const imageRotationStore = createInMemoryTemplateImageRotationStore();
    const first = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: rotatingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      rotationKey: "listing-1:template-1-seeded",
      random: () => 0,
      imageRotationStore
    });
    const second = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: rotatingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      rotationKey: "listing-1:template-1-seeded",
      random: () => 0,
      imageRotationStore
    });

    expect(first.backgroundImage1).toBe("https://cdn.example.com/1.jpg");
    expect(second.backgroundImage1).toBe("https://cdn.example.com/3.jpg");
  });

  it("seeds first rotation index from random when rotation key is first seen", () => {
    const rotatingImages = [
      ...listingImages,
      {
        id: "img-3",
        url: "https://cdn.example.com/3.jpg",
        category: "living room",
        isPrimary: true,
        primaryScore: 0.6,
        uploadedAt: new Date("2026-02-16T00:00:00.000Z")
      }
    ];

    const first = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: rotatingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      rotationKey: "listing-1:template-1-random-start",
      random: () => 0.99
    });

    expect(first.backgroundImage1).toBe("https://cdn.example.com/2.jpg");
  });
});
