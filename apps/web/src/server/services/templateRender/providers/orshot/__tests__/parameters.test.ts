import { resolveTemplateParameters } from "../parameters";

jest.mock("@shared/utils", () => ({
  PREVIEW_TEXT_OVERLAY_ARROW_PATHS: ["/overlays/a.svg", "/overlays/b.svg"]
}));

describe("templateRender/providers/orshot/parameters", () => {
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

  it("builds parameter map for new listings", () => {
    const result = resolveTemplateParameters({
      subcategory: "new_listing",
      listing: listingBase as never,
      listingImages: listingImages as never,
      userAdditional: userAdditional as never,
      captionItem,
      siteOrigin: "https://app.example.com",
      random: () => 0,
      now: new Date("2026-02-21T00:00:00.000Z")
    });

    expect(result.headerTag).toBe("listed");
    expect(result.headerTextTop).toBe("Stunning modern");
    expect(result.headerTextBottom).toBe("home");
    expect(result.priceLabel).toBe("starting from");
    expect(result.listingPrice).toBe("$750,000");
    expect(result.squareFootage).toBe("2,500 sqft");
    expect(result.arrowImage).toContain("/overlays/");
    expect(result.featureList).toContain("4 beds");
    expect(result.featureList).toContain("3 baths");
    expect(result.realtorName).toBe("Agent Jane");
    expect(result.realtorProfileImage).toBe("https://cdn.example.com/headshot.jpg");
    expect(result.backgroundImage1).toBe("https://cdn.example.com/1.jpg");
    expect(result.openHouseDateTime).toMatch(/^Feb \d+(st|nd|rd|th), 7-10AM$/);
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
    expect(result.realtorName).toBe("Your Realtor");
    expect(result.backgroundImage1).toBe("");
  });
});
