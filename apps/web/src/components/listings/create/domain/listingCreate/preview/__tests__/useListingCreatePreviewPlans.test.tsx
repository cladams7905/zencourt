import { renderHook } from "@testing-library/react";
import { useListingCreatePreviewPlans } from "../previewPlans";

describe("useListingCreatePreviewPlans", () => {
  it("builds plans for video tab with clips and captions", () => {
    const { result } = renderHook(() =>
      useListingCreatePreviewPlans({
        listingId: "l1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        activeContentItems: [{ id: "caption-1", hook: "Hook" }] as never,
        listingClipItems: [{ id: "clip-1", videoUrl: "https://example.com/v.mp4", durationSeconds: 3 }] as never
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
        activeContentItems: [
          {
            id: "caption-1",
            hook: "Hook",
            orderedClipIds: ["clip-2", "clip-1"]
          }
        ] as never,
        listingClipItems: [
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
        activeContentItems: [
          {
            id: "caption-1",
            hook: "Hook",
            clipDurationOverrides: { "clip-2": 4, "clip-1": 2.75 }
          }
        ] as never,
        listingClipItems: [
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

  it("builds saved reel plans from explicit mixed-source sequence instead of auto-generated clip order", () => {
    const { result } = renderHook(() =>
      useListingCreatePreviewPlans({
        listingId: "l1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        activeContentItems: [
          {
            id: "saved-reel-1",
            hook: "Saved hook",
            reelSequence: [
              {
                sourceType: "listing_clip",
                sourceId: "clip-2",
                durationSeconds: 1.5
              },
              {
                sourceType: "user_media",
                sourceId: "media-1",
                durationSeconds: 2
              }
            ]
          }
        ] as never,
        listingClipItems: [
          {
            id: "clip-1",
            reelClipSource: "listing_clip",
            videoUrl: "https://example.com/1.mp4",
            durationSeconds: 3,
            category: "kitchen"
          },
          {
            id: "clip-2",
            reelClipSource: "listing_clip",
            videoUrl: "https://example.com/2.mp4",
            durationSeconds: 4,
            category: "exterior"
          },
          {
            id: "user-media:media-1",
            reelClipSource: "user_media",
            videoUrl: "https://example.com/media.mp4",
            durationSeconds: 5,
            category: "user media"
          }
        ] as never
      })
    );

    expect(result.current[0]?.segments).toEqual([
      expect.objectContaining({
        clipId: "clip-2",
        sourceType: "listing_clip",
        sourceId: "clip-2",
        durationSeconds: 1.5
      }),
      expect.objectContaining({
        clipId: "user-media:media-1",
        sourceType: "user_media",
        sourceId: "media-1",
        durationSeconds: 2
      })
    ]);
  });

  it("uses cache identity as the stable seed for untouched cached auto-generated reels", () => {
    const listingClipItems = [
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
      },
      {
        id: "clip-3",
        videoUrl: "https://example.com/3.mp4",
        durationSeconds: 5,
        category: "bathroom"
      }
    ] as never;

    const first = renderHook(() =>
      useListingCreatePreviewPlans({
        listingId: "l1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        activeContentItems: [
          {
            id: "generated-batch-a-0",
            hook: "Hook",
            cacheKeyTimestamp: 123,
            cacheKeyId: 0
          }
        ] as never,
        listingClipItems
      })
    );

    const second = renderHook(() =>
      useListingCreatePreviewPlans({
        listingId: "l1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        activeContentItems: [
          {
            id: "cached-new_listing-video-123-0",
            hook: "Hook",
            cacheKeyTimestamp: 123,
            cacheKeyId: 0
          }
        ] as never,
        listingClipItems
      })
    );

    expect(first.result.current[0]?.segments).toEqual(
      second.result.current[0]?.segments
    );
    expect(first.result.current[0]?.totalDurationSeconds).toBe(
      second.result.current[0]?.totalDurationSeconds
    );
  });
});
