import {
  buildReelSourceKey,
  isSavedListingReelMetadata
} from "@web/src/lib/domain/listings/content/reels";

describe("listing reel helpers", () => {
  it("accepts persisted listing reel metadata", () => {
    expect(
      isSavedListingReelMetadata({
        source: "listing_reel",
        version: 1,
        listingSubcategory: "new_listing",
        hook: "Fresh to market",
        caption: "Open concept with natural light",
        body: [{ header: "Kitchen", content: "Quartz counters" }],
        brollQuery: "kitchen",
        sequence: [
          {
            sourceType: "listing_clip",
            sourceId: "clip-1",
            durationSeconds: 2.5
          }
        ]
      })
    ).toBe(true);
  });

  it("rejects incomplete listing reel metadata", () => {
    expect(
      isSavedListingReelMetadata({
        source: "listing_reel",
        version: 1,
        hook: "Missing sequence"
      })
    ).toBe(false);
  });

  it("prefixes user media source keys", () => {
    expect(buildReelSourceKey("user_media", "media-1")).toBe(
      "user-media:media-1"
    );
    expect(buildReelSourceKey("listing_clip", "clip-1")).toBe("clip-1");
  });
});
