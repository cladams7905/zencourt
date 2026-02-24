import { renderHook } from "@testing-library/react";
import { useListingCreateActiveMediaItems } from "@web/src/components/listings/create/domain/useListingCreateActiveMediaItems";

describe("useListingCreateActiveMediaItems", () => {
  it("filters by subcategory and media type", () => {
    const localPostItems = [
      { id: "1", listingSubcategory: "new_listing", mediaType: "image" },
      { id: "2", listingSubcategory: "new_listing", mediaType: "video" },
      { id: "3", listingSubcategory: "price_drop", mediaType: "image" }
    ] as never;

    const { result } = renderHook(() =>
      useListingCreateActiveMediaItems({
        activeMediaTab: "images",
        activeSubcategory: "new_listing",
        localPostItems
      })
    );

    expect(result.current.map((item) => item.id)).toEqual(["1"]);
  });
});
