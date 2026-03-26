/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("@web/src/server/infra/cache/redis", () => ({
  getSharedRedisClient: jest.fn()
}));

import { getSharedRedisClient } from "@web/src/server/infra/cache/redis";
import {
  buildListingContentItemKey,
  deleteCachedListingContentItem,
  getAllCachedListingContentForFilter,
  getAllCachedListingContentForCreate,
  getCachedListingContentItem,
  getListingContentFilterPrefix,
  LISTING_CONTENT_CACHE_PREFIX,
  LISTING_CONTENT_CACHE_TTL_SECONDS,
  setCachedListingContentItem,
  updateCachedListingContentText,
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
        return {
          hook: "first",
          broll_query: "",
          body: null,
          cta: null,
          caption: ""
        };
      }
      if (key.endsWith(":100:3")) {
        return {
          hook: "third",
          broll_query: "",
          body: null,
          cta: null,
          caption: ""
        };
      }
      if (key.endsWith(":200:2")) {
        return {
          hook: "second",
          broll_query: "",
          body: null,
          cta: null,
          caption: ""
        };
      }
      return null;
    });
    mockedGetSharedRedisClient.mockReturnValue({
      scan,
      get
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    const results = await getAllCachedListingContentForFilter(baseParams);
    expect(scan).toHaveBeenCalled();
    expect(results.map((item) => item.hook)).toEqual([
      "first",
      "third",
      "second"
    ]);
    expect(
      results.map((item) => [item.cacheKeyTimestamp, item.cacheKeyId])
    ).toEqual([
      [100, 1],
      [100, 3],
      [200, 2]
    ]);
  });

  it("returns [] when scan fails", async () => {
    mockedGetSharedRedisClient.mockReturnValue({
      scan: jest.fn().mockRejectedValue(new Error("scan failed"))
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    await expect(
      getAllCachedListingContentForFilter(baseParams)
    ).resolves.toEqual([]);
  });

  it("no-ops when redis is unavailable", async () => {
    mockedGetSharedRedisClient.mockReturnValue(null as any);

    await expect(
      getAllCachedListingContentForFilter(baseParams)
    ).resolves.toEqual([]);
    await expect(
      getCachedListingContentItem({ ...baseParams, timestamp: 1, id: 1 })
    ).resolves.toBeNull();
    await expect(
      setCachedListingContentItem({
        ...baseParams,
        timestamp: 50,
        id: 3,
        item: {
          hook: "hook",
          broll_query: "",
          body: null,
          cta: null,
          caption: "cap",
          renderedImageUrl: null
        }
      })
    ).resolves.toBeUndefined();
    await expect(
      updateRenderedPreviewForItem({
        ...baseParams,
        timestamp: 22,
        id: 9,
        imageUrl: "https://img",
        templateId: "tpl",
        modifications: { headline: "A" }
      })
    ).resolves.toBeUndefined();
    await expect(
      deleteCachedListingContentItem({
        ...baseParams,
        timestamp: 22,
        id: 9
      })
    ).resolves.toBeUndefined();
  });

  it("reads one item by key and filters invalid payloads", async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({
        hook: "ok",
        broll_query: "",
        body: null,
        cta: null,
        caption: ""
      })
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

  it("returns [] when redis.get throws during scan iteration", async () => {
    const prefix = getListingContentFilterPrefix(baseParams);
    const scan = jest.fn().mockResolvedValue([0, [`${prefix}:100:1`]]);
    const get = jest.fn().mockRejectedValue(new Error("get failed"));
    mockedGetSharedRedisClient.mockReturnValue({
      scan,
      get
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    await expect(
      getAllCachedListingContentForFilter(baseParams)
    ).resolves.toEqual([]);
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

  it("does not update rendered preview when existing item is missing", async () => {
    const get = jest.fn().mockResolvedValue(null);
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

    expect(set).not.toHaveBeenCalled();
  });

  it("updates hook and caption for an existing cached item while preserving other fields", async () => {
    const get = jest.fn().mockResolvedValue({
      hook: "Original hook",
      broll_query: "q",
      body: [{ header: "Slide 1", content: "Body", broll_query: "b" }],
      cta: null,
      caption: "Original caption",
      orderedClipIds: ["clip-1", "clip-2"],
      clipDurationOverrides: { "clip-1": 2.5, "clip-2": 5 },
      renderedImageUrl: "https://rendered/image.png",
      renderedTemplateId: "tpl",
      renderedModifications: { headline: "A" }
    });
    const set = jest.fn().mockResolvedValue("OK");
    mockedGetSharedRedisClient.mockReturnValue({
      get,
      set
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    const result = await updateCachedListingContentText({
      ...baseParams,
      timestamp: 22,
      id: 9,
      hook: "Updated hook",
      caption: "Updated caption",
      orderedClipIds: ["clip-2", "clip-1"],
      clipDurationOverrides: { "clip-2": 4.25, "clip-1": 3.75 }
    });

    expect(result).toEqual(
      expect.objectContaining({
        hook: "Updated hook",
        caption: "Updated caption",
        orderedClipIds: ["clip-2", "clip-1"],
        clipDurationOverrides: { "clip-2": 4.25, "clip-1": 3.75 },
        body: [{ header: "Slide 1", content: "Body", broll_query: "b" }],
        renderedImageUrl: "https://rendered/image.png",
        renderedTemplateId: "tpl",
        renderedModifications: { headline: "A" }
      })
    );
    expect(set).toHaveBeenCalledWith(
      `${LISTING_CONTENT_CACHE_PREFIX}:user-1:listing-1:new_listing:video:22:9`,
      expect.objectContaining({
        hook: "Updated hook",
        caption: "Updated caption",
        orderedClipIds: ["clip-2", "clip-1"],
        clipDurationOverrides: { "clip-2": 4.25, "clip-1": 3.75 },
        body: [{ header: "Slide 1", content: "Body", broll_query: "b" }],
        renderedImageUrl: "https://rendered/image.png"
      }),
      { ex: LISTING_CONTENT_CACHE_TTL_SECONDS }
    );
  });

  it("returns null when text update target is missing", async () => {
    const get = jest.fn().mockResolvedValue(null);
    const set = jest.fn().mockResolvedValue("OK");
    mockedGetSharedRedisClient.mockReturnValue({
      get,
      set
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    const result = await updateCachedListingContentText({
      ...baseParams,
      timestamp: 22,
      id: 9,
      hook: "Updated hook",
      caption: "Updated caption",
      orderedClipIds: ["clip-2", "clip-1"],
      clipDurationOverrides: { "clip-2": 4.25, "clip-1": 3.75 }
    });

    expect(result).toBeNull();
    expect(set).not.toHaveBeenCalled();
  });

  it("warns and no-ops when update rendered preview fails", async () => {
    const get = jest.fn().mockRejectedValue(new Error("update get failed"));
    mockedGetSharedRedisClient.mockReturnValue({
      get
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    await expect(
      updateRenderedPreviewForItem({
        ...baseParams,
        timestamp: 22,
        id: 9,
        imageUrl: "https://img",
        templateId: "tpl",
        modifications: { headline: "A" }
      })
    ).resolves.toBeUndefined();
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

  it("warns and no-ops when set/delete throw", async () => {
    const set = jest.fn().mockRejectedValue(new Error("set failed"));
    const del = jest.fn().mockRejectedValue(new Error("del failed"));
    mockedGetSharedRedisClient.mockReturnValue({
      set,
      del
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    await expect(
      setCachedListingContentItem({
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
      })
    ).resolves.toBeUndefined();

    await expect(
      deleteCachedListingContentItem({
        ...baseParams,
        timestamp: 50,
        id: 3
      })
    ).resolves.toBeUndefined();
  });

  it("creates cached preview fields when rendered preview exists", async () => {
    const prefixForTarget = `${LISTING_CONTENT_CACHE_PREFIX}:user-1:listing-1:new_listing:video`;

    mockedGetSharedRedisClient.mockReturnValue({
      scan: jest.fn(async (_cursor: number, { match }: { match: string }) => {
        if (!match.startsWith(prefixForTarget)) {
          return [0, []];
        }
        return [0, [`${prefixForTarget}:123:7`]];
      }),
      get: jest.fn(async (key: string) => {
        if (key.endsWith(`${prefixForTarget}:123:7`)) {
          return {
            hook: "hook",
            broll_query: "",
            body: null,
            cta: null,
            caption: "caption",
            renderedImageUrl: "https://rendered/image.png",
            renderedTemplateId: "tpl",
            renderedModifications: { headline: "A" }
          };
        }
        return null;
      })
    } as unknown as ReturnType<typeof getSharedRedisClient>);

    const result = await getAllCachedListingContentForCreate({
      userId: baseParams.userId,
      listingId: baseParams.listingId
    });

    const created = result.find((r) =>
      r.id.includes("new_listing-video-123-7")
    );
    expect(created?.cachedRenderedPreview).toEqual({
      imageUrl: "https://rendered/image.png",
      templateId: "tpl",
      modifications: { headline: "A" }
    });
  });
});
