import {
  buildListingContentCacheKey,
  buildListingPropertyFingerprint,
  isListingMediaType,
  isListingSubcategory,
  LISTING_CONTENT_CACHE_PREFIX,
  parseListingAddressParts
} from "../listingContentCache";

describe("listingContentCache/helpers", () => {
  it("parses city/state/zip from address", () => {
    expect(parseListingAddressParts("123 Main St, Austin, TX 78701")).toEqual({
      city: "Austin",
      state: "TX",
      zipCode: "78701"
    });
  });

  it("validates media type", () => {
    expect(isListingMediaType("video")).toBe(true);
    expect(isListingMediaType("image")).toBe(true);
    expect(isListingMediaType("audio")).toBe(false);
  });

  it("builds deterministic property fingerprint", () => {
    const value = { beds: 3, baths: 2 };
    expect(buildListingPropertyFingerprint(value as never)).toBe(
      buildListingPropertyFingerprint(value as never)
    );
  });

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

  it("recognizes listing subcategory values", () => {
    expect(isListingSubcategory("new_listing")).toBe(true);
    expect(isListingSubcategory("not_real")).toBe(false);
  });
});
