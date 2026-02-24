jest.mock("@web/src/server/services/cache/redis", () => ({
  getSharedRedisClient: jest.fn()
}));

import {
  buildListingContentCacheKey,
  LISTING_CONTENT_CACHE_PREFIX
} from "..";

describe("listingContent cache", () => {
  it("builds cache key with expected prefix", () => {
    const key = buildListingContentCacheKey({
      userId: "user-1",
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "video",
      focus: "",
      notes: "",
      generation_nonce: "",
      propertyFingerprint: "abc123"
    });
    expect(key.startsWith(`${LISTING_CONTENT_CACHE_PREFIX}:user-1:listing-1`)).toBe(
      true
    );
  });
});
