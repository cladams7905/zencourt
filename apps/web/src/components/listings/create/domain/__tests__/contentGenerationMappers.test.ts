import type { ContentItem } from "@web/src/components/dashboard/ContentGrid";
import {
  ensureBatchItemIds,
  mapFinalItemsToContentItems,
  mapStreamedItemsToContentItems,
  mergeBatchItems,
  removeCurrentBatchItems
} from "@web/src/components/listings/create/domain/contentGenerationMappers";

describe("contentGenerationMappers", () => {
  it("ensures batch ids for the required count", () => {
    expect(
      ensureBatchItemIds({
        currentIds: ["existing-0"],
        requiredCount: 3,
        activeBatchId: "batch-1"
      })
    ).toEqual(["existing-0", "generated-batch-1-1", "generated-batch-1-2"]);
  });

  it("maps streamed and final items to content items with defaults", () => {
    const streamed = mapStreamedItemsToContentItems({
      items: [{ hook: "Hook 1", caption: "Caption 1", broll_query: "query-1" }],
      batchItemIds: ["id-1"],
      subcategory: "new_listing",
      mediaType: "video"
    });
    const final = mapFinalItemsToContentItems({
      items: [{ hook: "Hook 2", body: null }],
      batchItemIds: ["id-2"],
      subcategory: "property_features",
      mediaType: "image"
    });

    expect(streamed[0]).toMatchObject({
      id: "id-1",
      aspectRatio: "square",
      isFavorite: false,
      hook: "Hook 1",
      caption: "Caption 1",
      brollQuery: "query-1",
      listingSubcategory: "new_listing",
      mediaType: "video"
    });
    expect(final[0]).toMatchObject({
      id: "id-2",
      hook: "Hook 2",
      caption: null,
      body: null,
      listingSubcategory: "property_features",
      mediaType: "image"
    });
  });

  it("removes current batch items", () => {
    const items: ContentItem[] = [
      { id: "batch-0" },
      { id: "keep-1" },
      { id: "batch-2" }
    ];
    expect(removeCurrentBatchItems(items, ["batch-0", "batch-2"])).toEqual([
      { id: "keep-1" }
    ]);
  });

  it("merges items without forceNewBatch and dedupes by id", () => {
    const previousItems: ContentItem[] = [
      { id: "older-1", hook: "old-1" },
      { id: "batch-1", hook: "to-replace" }
    ];
    const finalItems: ContentItem[] = [
      { id: "older-1", hook: "duplicate-ignored" },
      { id: "batch-1", hook: "replacement" },
      { id: "new-1", hook: "new" }
    ];

    const merged = mergeBatchItems({
      previousItems,
      finalItems,
      batchItemIds: ["batch-1"],
      forceNewBatch: false
    });

    expect(merged).toEqual([
      { id: "older-1", hook: "old-1" },
      { id: "batch-1", hook: "replacement" },
      { id: "new-1", hook: "new" }
    ]);
  });

  it("replaces current batch and appends final items when forceNewBatch is true", () => {
    const merged = mergeBatchItems({
      previousItems: [
        { id: "older-1", hook: "old-1" },
        { id: "batch-1", hook: "to-replace" }
      ],
      finalItems: [
        { id: "batch-1", hook: "replacement" },
        { id: "older-1", hook: "can-duplicate-when-forced" }
      ],
      batchItemIds: ["batch-1"],
      forceNewBatch: true
    });

    expect(merged).toEqual([
      { id: "older-1", hook: "old-1" },
      { id: "batch-1", hook: "replacement" },
      { id: "older-1", hook: "can-duplicate-when-forced" }
    ]);
  });
});
