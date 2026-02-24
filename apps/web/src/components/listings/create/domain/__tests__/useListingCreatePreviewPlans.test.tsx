import { renderHook } from "@testing-library/react";
import { useListingCreatePreviewPlans } from "@web/src/components/listings/create/domain/useListingCreatePreviewPlans";

describe("useListingCreatePreviewPlans", () => {
  it("builds plans for video tab with clips and captions", () => {
    const { result } = renderHook(() =>
      useListingCreatePreviewPlans({
        listingId: "l1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        activeMediaItems: [{ id: "caption-1", hook: "Hook" }] as never,
        videoItems: [{ id: "clip-1", videoUrl: "https://example.com/v.mp4", durationSeconds: 3 }] as never
      })
    );

    expect(result.current.length).toBe(1);
  });
});
