/** @jest-environment node */

const mockBuildReelSourceKey = jest.fn();
const mockIsSavedListingReelMetadata = jest.fn();

jest.mock("@web/src/lib/domain/listings/content/reels", () => ({
  buildReelSourceKey: (...args: unknown[]) => mockBuildReelSourceKey(...args),
  isSavedListingReelMetadata: (...args: unknown[]) =>
    mockIsSavedListingReelMetadata(...args)
}));

import {
  buildSavedReelDedupKey,
  mapSavedReelContentToCreateItem,
  mapUserMediaToVideoItem
} from "@web/src/server/actions/listings/content/reels/mappers";

describe("listing reel mappers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("maps valid saved reel content into a create item", () => {
    mockIsSavedListingReelMetadata.mockReturnValue(true);

    expect(
      mapSavedReelContentToCreateItem({
        id: "content-1",
        contentType: "video",
        isFavorite: true,
        metadata: {
          hook: "Hook",
          caption: "Caption",
          body: [{ header: "h", content: "c" }],
          brollQuery: "kitchen",
          listingSubcategory: "new_listing",
          sequence: [
            {
              sourceType: "listing_clip",
              sourceId: "clip-1",
              durationSeconds: 2
            }
          ]
        }
      } as never)
    ).toEqual(
      expect.objectContaining({
        id: "saved-content-1",
        body: null,
        contentSource: "saved_content",
        savedContentId: "content-1"
      })
    );
  });

  it("returns null for invalid saved reel content and non-video user media", () => {
    mockIsSavedListingReelMetadata.mockReturnValue(false);

    expect(
      mapSavedReelContentToCreateItem({
        id: "content-1",
        contentType: "image",
        metadata: {}
      } as never)
    ).toBeNull();

    expect(
      mapUserMediaToVideoItem({
        id: "media-1",
        type: "image"
      } as never)
    ).toBeNull();
  });

  it("builds dedup keys and maps video user media", () => {
    mockBuildReelSourceKey.mockReturnValue("user-media:media-1");

    expect(buildSavedReelDedupKey({} as never)).toBeNull();
    expect(
      buildSavedReelDedupKey({
        originCacheKeyTimestamp: 101,
        originCacheKeyId: 3
      } as never)
    ).toBe("101:3");

    expect(
      mapUserMediaToVideoItem({
        id: "media-1",
        type: "video",
        url: "https://example.com/media.mp4",
        thumbnailUrl: "https://example.com/media.jpg",
        durationSeconds: null
      } as never)
    ).toEqual(
      expect.objectContaining({
        id: "user-media:media-1",
        durationSeconds: 3,
        reelClipSource: "user_media"
      })
    );
  });
});
