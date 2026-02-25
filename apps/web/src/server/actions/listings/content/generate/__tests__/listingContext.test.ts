jest.mock("@web/src/server/infra/cache/redis", () => ({
  getSharedRedisClient: jest.fn()
}));

import { resolveListingContext } from "../listingContext";

describe("listingContext", () => {
  it("resolves context with address parts and cache key", () => {
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
      expect(ctx.cacheKey).toMatch(/^listing-content:user-1:listing-1:new_listing:video:/);
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
});
