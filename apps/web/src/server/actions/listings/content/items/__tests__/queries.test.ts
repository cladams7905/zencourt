/** @jest-environment node */

const mockGetContentByListingId = jest.fn();
const mockGetCachedListingContentForCreateFilter = jest.fn();
const mockIsSavedListingReelMetadata = jest.fn();
const mockBuildSavedReelDedupKey = jest.fn();
const mockMapSavedReelContentToCreateItem = jest.fn();

jest.mock("@web/src/server/models/content", () => ({
  getContentByListingId: (...args: unknown[]) => mockGetContentByListingId(...args)
}));

jest.mock("@web/src/server/infra/cache/listingContent/cache", () => ({
  getCachedListingContentForCreateFilter: (...args: unknown[]) =>
    mockGetCachedListingContentForCreateFilter(...args)
}));

jest.mock("@web/src/lib/domain/listings/content/reels", () => ({
  isSavedListingReelMetadata: (...args: unknown[]) =>
    mockIsSavedListingReelMetadata(...args)
}));

jest.mock("@web/src/server/actions/listings/content/reels", () => ({
  buildSavedReelDedupKey: (...args: unknown[]) =>
    mockBuildSavedReelDedupKey(...args),
  mapSavedReelContentToCreateItem: (...args: unknown[]) =>
    mockMapSavedReelContentToCreateItem(...args)
}));

import { getListingContentItems } from "@web/src/server/actions/listings/content/items/queries";

describe("listing content item queries", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("merges saved items with cached items, removes stale duplicates, and clamps pagination", async () => {
    mockGetCachedListingContentForCreateFilter.mockResolvedValue([
      { id: "cached-stale", cacheKeyTimestamp: 100, cacheKeyId: 1, hook: "A" },
      { id: "cached-keep", cacheKeyTimestamp: 101, cacheKeyId: 2, hook: "B" }
    ]);
    const matchingSavedRow = {
      id: "saved-1",
      contentType: "video",
      metadata: { listingSubcategory: "new_listing" }
    };
    mockGetContentByListingId.mockResolvedValue([
      matchingSavedRow,
      {
        id: "saved-2",
        contentType: "image",
        metadata: { listingSubcategory: "new_listing" }
      },
      {
        id: "saved-3",
        contentType: "video",
        metadata: { listingSubcategory: "open_house" }
      },
      {
        id: "saved-4",
        contentType: "video",
        metadata: { listingSubcategory: "new_listing" }
      }
    ]);
    mockIsSavedListingReelMetadata
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    mockBuildSavedReelDedupKey.mockReturnValueOnce("100:1");
    mockMapSavedReelContentToCreateItem.mockReturnValueOnce({
      id: "saved-item-1",
      contentSource: "saved_content"
    });

    const result = await getListingContentItems({
      userId: "user-1",
      listingId: "listing-1",
      mediaTab: "videos",
      subcategory: "new_listing",
      limit: 999,
      offset: -4
    });

    expect(mockGetCachedListingContentForCreateFilter).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "video"
    });
    expect(result).toEqual({
      items: [
        { id: "saved-item-1", contentSource: "saved_content" },
        expect.objectContaining({
          id: "cached-keep",
          contentSource: "cached_create"
        })
      ],
      hasMore: false,
      nextOffset: 2
    });
  });

  it("uses image filters and respects offset pagination", async () => {
    mockGetCachedListingContentForCreateFilter.mockResolvedValue([
      { id: "cached-1", cacheKeyTimestamp: 1, cacheKeyId: 1 },
      { id: "cached-2", cacheKeyTimestamp: 2, cacheKeyId: 2 }
    ]);
    mockGetContentByListingId.mockResolvedValue([]);

    const result = await getListingContentItems({
      userId: "user-1",
      listingId: "listing-1",
      mediaTab: "images",
      offset: 1,
      limit: 1
    });

    expect(mockGetCachedListingContentForCreateFilter).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "image"
    });
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: "cached-2",
          contentSource: "cached_create"
        })
      ],
      hasMore: false,
      nextOffset: 2
    });
  });
});
