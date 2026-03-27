import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import { getEmptyBucket, type FilterBuckets } from "../../items/filterBuckets";
import {
  appendPageItems,
  removeBatchItemsFromBucket,
  removeContentItemFromBuckets,
  replaceContentItemInBuckets,
  settleBucketItems
} from "../stateTransitions";

describe("contentGeneration/stateTransitions", () => {
  it("settles a bucket and resets loading state", () => {
    const bucket = {
      ...getEmptyBucket(),
      isLoadingInitialPage: true,
      isLoadingMore: true,
      hasFetchedInitialPage: false,
      items: [{ id: "old-1" } as ContentItem]
    };

    expect(settleBucketItems(bucket, [{ id: "new-1" } as ContentItem])).toEqual({
      ...bucket,
      items: [{ id: "new-1" }],
      isLoadingInitialPage: false,
      isLoadingMore: false,
      hasFetchedInitialPage: true,
      offset: 1,
      loadedCount: 1
    });
  });

  it("removes batch items and updates counts", () => {
    const bucket = {
      ...getEmptyBucket(),
      items: [
        { id: "batch-1" },
        { id: "keep-1" },
        { id: "batch-2" }
      ] as ContentItem[],
      loadedCount: 3
    };

    expect(removeBatchItemsFromBucket(bucket, ["batch-1", "batch-2"])).toMatchObject({
      items: [{ id: "keep-1" }],
      loadedCount: 1
    });
  });

  it("appends only new page items and advances paging metadata", () => {
    const bucket = {
      ...getEmptyBucket(),
      items: [{ id: "keep-1" }, { id: "keep-2" }] as ContentItem[],
      isLoadingMore: true
    };

    expect(
      appendPageItems(bucket, {
        items: [{ id: "keep-2" }, { id: "new-1" }] as ContentItem[],
        hasMore: true,
        nextOffset: 3
      })
    ).toMatchObject({
      items: [{ id: "keep-1" }, { id: "keep-2" }, { id: "new-1" }],
      isLoadingMore: false,
      hasMore: true,
      offset: 3,
      loadedCount: 3
    });
  });

  it("removes a content item across all buckets", () => {
    const buckets: FilterBuckets = {
      first: {
        ...getEmptyBucket(),
        items: [{ id: "remove-me" }, { id: "keep-1" }] as ContentItem[],
        loadedCount: 2
      },
      second: {
        ...getEmptyBucket(),
        items: [{ id: "keep-2" }, { id: "remove-me" }] as ContentItem[],
        loadedCount: 2
      }
    };

    expect(removeContentItemFromBuckets(buckets, "remove-me")).toEqual({
      first: expect.objectContaining({
        items: [{ id: "keep-1" }],
        loadedCount: 1
      }),
      second: expect.objectContaining({
        items: [{ id: "keep-2" }],
        loadedCount: 1
      })
    });
  });

  it("replaces a content item across all buckets", () => {
    const buckets: FilterBuckets = {
      first: {
        ...getEmptyBucket(),
        items: [{ id: "old-1", hook: "old" }] as ContentItem[],
        loadedCount: 1
      },
      second: {
        ...getEmptyBucket(),
        items: [{ id: "keep-1" }, { id: "old-1", hook: "old" }] as ContentItem[],
        loadedCount: 2
      }
    };

    expect(
      replaceContentItemInBuckets(buckets, {
        previousContentItemId: "old-1",
        nextItem: { id: "new-1", hook: "new" } as ContentItem
      })
    ).toEqual({
      first: expect.objectContaining({
        items: [{ id: "new-1", hook: "new" }],
        loadedCount: 1
      }),
      second: expect.objectContaining({
        items: [{ id: "keep-1" }, { id: "new-1", hook: "new" }],
        loadedCount: 2
      })
    });
  });
});
