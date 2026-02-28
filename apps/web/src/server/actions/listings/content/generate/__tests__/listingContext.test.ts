jest.mock("@web/src/server/infra/cache/redis", () => ({
  getSharedRedisClient: jest.fn()
}));

import { resolveListingContext } from "../listingContext";

describe("listingContext", () => {
  it("resolves context with address parts", () => {
      const listing = {
        id: "listing-1",
        userId: "user-1",
        address: "123 Main St, Austin, TX 78701",
        propertyDetails: null
      };
      const params = {
        listingId: "listing-1",
        subcategory: "new_listing" as const,
        mediaType: "video" as const,
        focus: "",
        notes: "",
        generationNonce: "",
        generationCount: 4,
        templateId: ""
      };
      const ctx = resolveListingContext(listing, params);
      expect(ctx.addressParts).toEqual({
        city: "Austin",
        state: "TX",
        zipCode: "78701"
      });
      expect(ctx.openHouseContext).toBeNull();
    });

  it("builds deterministic property fingerprint for same details", () => {
    const details = { beds: 3, baths: 2 };
    const listing = {
      id: "listing-1",
      userId: "user-1",
      address: null,
      propertyDetails: details
    };
    const params = {
      listingId: "listing-1",
      subcategory: "new_listing" as const,
      mediaType: "video" as const,
      focus: "",
      notes: "",
      generationNonce: "",
      generationCount: 4,
      templateId: ""
    };
    const ctx1 = resolveListingContext(listing, params);
    const ctx2 = resolveListingContext(listing, params);
    expect(ctx1.propertyFingerprint).toBe(ctx2.propertyFingerprint);
  });

  it("resolves open house context only for open_house subcategory", () => {
    const listing = {
      id: "listing-1",
      userId: "user-1",
      address: "123 Main St, Austin, TX 78701",
      propertyDetails: {
        open_house_events: [
          { date: "2026-03-01", start_time: "13:00", end_time: "15:00" }
        ]
      }
    };

    const openHouseCtx = resolveListingContext(listing, {
      listingId: "listing-1",
      subcategory: "open_house",
      mediaType: "image",
      focus: "",
      notes: "",
      generationNonce: "",
      generationCount: 4,
      templateId: ""
    });
    const newListingCtx = resolveListingContext(listing, {
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "image",
      focus: "",
      notes: "",
      generationNonce: "",
      generationCount: 4,
      templateId: ""
    });

    expect(openHouseCtx.openHouseContext?.hasAnyEvent).toBe(true);
    expect(newListingCtx.openHouseContext).toBeNull();
  });
});
