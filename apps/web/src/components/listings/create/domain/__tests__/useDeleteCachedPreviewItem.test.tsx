import { act, renderHook } from "@testing-library/react";

const mockDeleteCachedListingContentItem = jest.fn();

jest.mock("@web/src/server/actions/listings/commands", () => ({
  deleteCachedListingContentItem: (...args: unknown[]) =>
    mockDeleteCachedListingContentItem(...args)
}));

import { useDeleteCachedPreviewItem } from "@web/src/components/listings/create/domain/useDeleteCachedPreviewItem";

describe("useDeleteCachedPreviewItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes cache entry before removing local item", async () => {
    const removeContentItem = jest.fn();
    mockDeleteCachedListingContentItem.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDeleteCachedPreviewItem({
        listingId: "l1",
        activeSubcategory: "new_listing",
        activeMediaItems: [
          { id: "item-1", cacheKeyTimestamp: 10, cacheKeyId: 3 }
        ] as never,
        removeContentItem
      })
    );

    await act(async () => {
      await result.current("item-1");
    });

    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledWith("l1", {
      cacheKeyTimestamp: 10,
      cacheKeyId: 3,
      subcategory: "new_listing"
    });
    expect(removeContentItem).toHaveBeenCalledWith("item-1");
  });
});
