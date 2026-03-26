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

  it("applies saved ordered clip ids from the caption item", () => {
    const { result } = renderHook(() =>
      useListingCreatePreviewPlans({
        listingId: "l1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        activeMediaItems: [
          {
            id: "caption-1",
            hook: "Hook",
            orderedClipIds: ["clip-2", "clip-1"]
          }
        ] as never,
        videoItems: [
          {
            id: "clip-1",
            videoUrl: "https://example.com/1.mp4",
            durationSeconds: 3,
            category: "kitchen"
          },
          {
            id: "clip-2",
            videoUrl: "https://example.com/2.mp4",
            durationSeconds: 4,
            category: "exterior"
          }
        ] as never
      })
    );

    expect(result.current[0]?.segments.map((segment) => segment.clipId)).toEqual([
      "clip-2",
      "clip-1"
    ]);
  });

  it("applies saved clip duration overrides from the caption item", () => {
    const { result } = renderHook(() =>
      useListingCreatePreviewPlans({
        listingId: "l1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        activeMediaItems: [
          {
            id: "caption-1",
            hook: "Hook",
            clipDurationOverrides: { "clip-2": 4, "clip-1": 2.75 }
          }
        ] as never,
        videoItems: [
          {
            id: "clip-1",
            videoUrl: "https://example.com/1.mp4",
            durationSeconds: 3,
            category: "kitchen"
          },
          {
            id: "clip-2",
            videoUrl: "https://example.com/2.mp4",
            durationSeconds: 4,
            category: "exterior"
          }
        ] as never
      })
    );

    expect(
      Object.fromEntries(
        (result.current[0]?.segments ?? []).map((segment) => [
          segment.clipId,
          segment.durationSeconds
        ])
      )
    ).toEqual({ "clip-1": 2.75, "clip-2": 4 });
    expect(result.current[0]?.totalDurationSeconds).toBe(6.75);
  });
});
