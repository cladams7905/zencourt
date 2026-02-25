jest.mock("@web/src/server/infra/cache/redis", () => ({
  getSharedRedisClient: jest.fn()
}));

import { getSharedRedisClient } from "@web/src/server/infra/cache/redis";
import {
  buildListingContentItemKey,
  deleteCachedListingContentItem,
  getAllCachedListingContentForFilter,
  getCachedListingContentItem,
  getListingContentFilterPrefix,
  LISTING_CONTENT_CACHE_PREFIX,
  LISTING_CONTENT_CACHE_TTL_SECONDS,
  setCachedListingContentItem,
  updateRenderedPreviewForItem
} from "../cache";

describe("listingContent cache", () => {
  const mockedGetSharedRedisClient = jest.mocked(getSharedRedisClient);
  const baseParams = {
    userId: "user-1",
    listingId: "listing-1",
    subcategory: "new_listing" as const,
    mediaType: "video" as const
  };

  beforeEach(() => {
    mockedGetSharedRedisClient.mockReset();
  });

  it("builds item key and filter prefix", () => {
    const key = buildListingContentItemKey({
      ...baseParams,
      timestamp: 123,
      id: 7
    });
    expect(key).toBe(
      `${LISTING_CONTENT_CACHE_PREFIX}:user-1:listing-1:new_listing:video:123:7`
    );

    const prefix = getListingContentFilterPrefix(baseParams);
    expect(prefix).toBe(
      `${LISTING_CONTENT_CACHE_PREFIX}:user-1:listing-1:new_listing:video`
    );
  });

  it("scans per-item keys, sorts, and returns only valid items", async () => {
    const prefix = getListingContentFilterPrefix(baseParams);
    const scan = jest
      .fn()
      .mockResolvedValueOnce(["12", [`${prefix}:bad:part`]])
      .mockResolvedValueOnce([
        0,
        [`${prefix}:200:2`, `${prefix}:100:3`, `${prefix}:100:1`]
      ]);
    const get = jest.fn(async (key: string) => {
      if (key.endsWith(":100:1")) {
        return { hook: "first", broll_query: "", body: null, cta: null, caption: "" };
      }
      if (key.endsWith(":100:3")) {
        return { hook: "third", broll_query: "", body: null, cta: null, caption: "" };
      }
      if (key.endsWith(":200:2")) {
        return { hook: "second", broll_query: "", body: null, cta: null, caption: "" };
      }
      return null;
    });
    mockedGetSharedRedisClient.mockReturnValue({
      scan,
      get
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    const results = await getAllCachedListingContentForFilter(baseParams);
    expect(scan).toHaveBeenCalled();
    expect(results.map((item) => item.hook)).toEqual(["first", "third", "second"]);
    expect(results.map((item) => [item.cacheKeyTimestamp, item.cacheKeyId])).toEqual([
      [100, 1],
      [100, 3],
      [200, 2]
    ]);
  });

  it("returns [] when scan fails", async () => {
    mockedGetSharedRedisClient.mockReturnValue({
      scan: jest.fn().mockRejectedValue(new Error("scan failed"))
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    await expect(getAllCachedListingContentForFilter(baseParams)).resolves.toEqual([]);
  });

  it("reads one item by key and filters invalid payloads", async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({ hook: "ok", broll_query: "", body: null, cta: null, caption: "" })
      .mockResolvedValueOnce({ invalid: true });
    mockedGetSharedRedisClient.mockReturnValue({
      get
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    await expect(
      getCachedListingContentItem({ ...baseParams, timestamp: 1, id: 1 })
    ).resolves.toEqual({
      hook: "ok",
      broll_query: "",
      body: null,
      cta: null,
      caption: ""
    });
    await expect(
      getCachedListingContentItem({ ...baseParams, timestamp: 1, id: 2 })
    ).resolves.toBeNull();
  });

  it("updates rendered preview for an existing cached item", async () => {
    const get = jest.fn().mockResolvedValue({
      hook: "hook",
      broll_query: "q",
      body: null,
      cta: null,
      caption: "caption",
      renderedImageUrl: null
    });
    const set = jest.fn().mockResolvedValue("OK");
    mockedGetSharedRedisClient.mockReturnValue({
      get,
      set
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    await updateRenderedPreviewForItem({
      ...baseParams,
      timestamp: 22,
      id: 9,
      imageUrl: "https://img",
      templateId: "tpl",
      modifications: { headline: "A" }
    });

    expect(set).toHaveBeenCalledWith(
      `${LISTING_CONTENT_CACHE_PREFIX}:user-1:listing-1:new_listing:video:22:9`,
      expect.objectContaining({
        renderedImageUrl: "https://img",
        renderedTemplateId: "tpl",
        renderedModifications: { headline: "A" }
      }),
      { ex: LISTING_CONTENT_CACHE_TTL_SECONDS }
    );
  });

  it("sets and deletes per-item cache entries", async () => {
    const set = jest.fn().mockResolvedValue("OK");
    const del = jest.fn().mockResolvedValue(1);
    mockedGetSharedRedisClient.mockReturnValue({
      set,
      del
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    await setCachedListingContentItem({
      ...baseParams,
      timestamp: 50,
      id: 3,
      item: {
        hook: "hook",
        broll_query: "q",
        body: null,
        cta: null,
        caption: "caption",
        renderedImageUrl: null
      }
    });
    await deleteCachedListingContentItem({
      ...baseParams,
      timestamp: 50,
      id: 3
    });

    expect(set).toHaveBeenCalledWith(
      `${LISTING_CONTENT_CACHE_PREFIX}:user-1:listing-1:new_listing:video:50:3`,
      expect.objectContaining({ hook: "hook" }),
      { ex: LISTING_CONTENT_CACHE_TTL_SECONDS }
    );
    expect(del).toHaveBeenCalledWith(
      `${LISTING_CONTENT_CACHE_PREFIX}:user-1:listing-1:new_listing:video:50:3`
    );
  });
});
