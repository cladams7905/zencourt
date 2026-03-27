import {
  buildListingCreatePreviewPlans,
  buildPreviewTimelinePlan,
  buildPreviewTimelinePlans,
  buildPreviewTimelineVariants,
  type PreviewTimelineClip
} from "@web/src/lib/domain/listings/content/createPreviewPlans";

const clips: PreviewTimelineClip[] = [
  {
    id: "a",
    category: "kitchen",
    durationSeconds: 4,
    isPriorityCategory: true,
    sortOrder: 1
  },
  {
    id: "b",
    category: "bathroom",
    durationSeconds: 3,
    isPriorityCategory: false,
    sortOrder: 2
  },
  {
    id: "c",
    category: "bedroom",
    durationSeconds: 5,
    isPriorityCategory: true,
    sortOrder: 3
  },
  {
    id: "d",
    category: "exterior",
    durationSeconds: 6,
    isPriorityCategory: false,
    sortOrder: 4
  }
];

describe("createPreviewPlans", () => {
  it("builds deterministic plans for the same seed", () => {
    const first = buildPreviewTimelinePlan({
      clips,
      listingId: "listing-1",
      seedKey: "seed-1"
    });
    const second = buildPreviewTimelinePlan({
      clips,
      listingId: "listing-1",
      seedKey: "seed-1"
    });

    expect(first).toEqual(second);
    expect(first.id).toBe("plan-seed-1");
  });

  it("applies minimum duration and total equals sum of segment durations", () => {
    const minDurationClips: PreviewTimelineClip[] = [
      { id: "x", durationSeconds: 1, isPriorityCategory: false },
      { id: "y", durationSeconds: 1, isPriorityCategory: false }
    ];

    const plan = buildPreviewTimelinePlan({
      clips: minDurationClips,
      listingId: "listing-2",
      seedKey: "seed-min"
    });

    expect(plan.segments).toHaveLength(2);
    for (const segment of plan.segments) {
      expect(segment.durationSeconds).toBeGreaterThanOrEqual(2);
    }

    const baseDuration = plan.segments.reduce(
      (acc, segment) => acc + segment.durationSeconds,
      0
    );
    expect(plan.totalDurationSeconds).toBe(Number(baseDuration.toFixed(2)));
  });

  it("builds series and variants with stable ids", () => {
    const series = buildPreviewTimelinePlans(clips, "listing-3", 3, "batch");
    expect(series.map((plan) => plan.id)).toEqual([
      "plan-batch-1",
      "plan-batch-2",
      "plan-batch-3"
    ]);

    const variants = buildPreviewTimelineVariants(clips, "listing-3");
    expect(variants).toHaveLength(3);
    expect(variants.map((plan) => plan.id)).toEqual([
      "plan-series-1",
      "plan-series-2",
      "plan-series-3"
    ]);
  });

  it("returns empty plan series when inputs are empty or count is invalid", () => {
    expect(buildPreviewTimelinePlans([], "listing-4", 3)).toEqual([]);
    expect(buildPreviewTimelinePlans(clips, "listing-4", 0)).toEqual([]);
  });

  it("returns no listing create plans for non-video tabs or empty content", () => {
    expect(
      buildListingCreatePreviewPlans({
        listingId: "listing-1",
        activeMediaTab: "images",
        activeSubcategory: "new_listing",
        activeContentItems: [{ id: "caption-1" }],
        listingClipItems: [{ id: "clip-1", videoUrl: "https://example.com/1.mp4" }]
      } as never)
    ).toEqual([]);

    expect(
      buildListingCreatePreviewPlans({
        listingId: "listing-1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        activeContentItems: [],
        listingClipItems: [{ id: "clip-1", videoUrl: "https://example.com/1.mp4" }]
      } as never)
    ).toEqual([]);
  });

  it("returns an empty plan when no valid video clip candidates exist", () => {
    expect(
      buildListingCreatePreviewPlans({
        listingId: "listing-1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        activeContentItems: [{ id: "caption-1", hook: "Hook" }],
        listingClipItems: [
          { id: "user-1", reelClipSource: "user_media", videoUrl: "https://example.com/u.mp4" },
          { id: "clip-2", reelClipSource: "listing_clip", videoUrl: null }
        ]
      } as never)
    ).toEqual([
      {
        id: "plan-new_listing-caption-1",
        segments: [],
        totalDurationSeconds: 0
      }
    ]);
  });

  it("filters property feature clips and clamps reel sequence and override durations", () => {
    const [featurePlan] = buildListingCreatePreviewPlans({
      listingId: "listing-1",
      activeMediaTab: "videos",
      activeSubcategory: "property_features",
      activeContentItems: [
        {
          id: "caption-1",
          hook: "Kitchen with pantry and island",
          clipDurationOverrides: { "clip-kitchen": 99, "clip-yard": 0.1 }
        }
      ],
      listingClipItems: [
        {
          id: "clip-kitchen",
          reelClipSource: "listing_clip",
          videoUrl: "https://example.com/kitchen.mp4",
          durationSeconds: 4,
          category: "kitchen",
          alt: "Kitchen island"
        },
        {
          id: "clip-yard",
          reelClipSource: "listing_clip",
          videoUrl: "https://example.com/yard.mp4",
          durationSeconds: 6,
          category: "yard",
          alt: "Back yard"
        }
      ]
    } as never);

    expect(featurePlan.segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clipId: "clip-kitchen",
          durationSeconds: 4
        }),
        expect.objectContaining({
          clipId: "clip-yard",
          durationSeconds: 0.5
        })
      ])
    );

    const [savedPlan] = buildListingCreatePreviewPlans({
      listingId: "listing-1",
      activeMediaTab: "videos",
      activeSubcategory: "new_listing",
      activeContentItems: [
        {
          id: "saved-1",
          reelSequence: [
            { sourceType: "listing_clip", sourceId: "clip-kitchen", durationSeconds: 9 },
            { sourceType: "user_media", sourceId: "media-1", durationSeconds: 0.1 },
            { sourceType: "listing_clip", sourceId: "missing", durationSeconds: 2 }
          ]
        }
      ],
      listingClipItems: [
        {
          id: "clip-kitchen",
          reelClipSource: "listing_clip",
          videoUrl: "https://example.com/kitchen.mp4",
          durationSeconds: 4,
          category: "kitchen"
        },
        {
          id: "user-media:media-1",
          reelClipSource: "user_media",
          videoUrl: "https://example.com/media.mp4",
          durationSeconds: 3,
          roomName: "Phone clip"
        }
      ]
    } as never);

    expect(savedPlan.segments).toEqual([
      expect.objectContaining({
        clipId: "clip-kitchen",
        durationSeconds: 4,
        sourceType: "listing_clip"
      }),
      expect.objectContaining({
        clipId: "user-media:media-1",
        durationSeconds: 0.5,
        sourceType: "user_media"
      })
    ]);
  });
});
