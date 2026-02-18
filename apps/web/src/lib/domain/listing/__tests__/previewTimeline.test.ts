import {
  buildPreviewTimelinePlan,
  buildPreviewTimelinePlans,
  buildPreviewTimelineVariants,
  type PreviewTimelineClip
} from "@web/src/lib/domain/listing/previewTimeline";

const clips: PreviewTimelineClip[] = [
  { id: "a", category: "kitchen", durationSeconds: 4, isPriorityCategory: true, sortOrder: 1 },
  { id: "b", category: "bathroom", durationSeconds: 3, isPriorityCategory: false, sortOrder: 2 },
  { id: "c", category: "bedroom", durationSeconds: 5, isPriorityCategory: true, sortOrder: 3 },
  { id: "d", category: "exterior", durationSeconds: 6, isPriorityCategory: false, sortOrder: 4 }
];

describe("previewTimeline", () => {
  it("builds deterministic plans for the same seed", () => {
    const first = buildPreviewTimelinePlan({ clips, listingId: "listing-1", seedKey: "seed-1" });
    const second = buildPreviewTimelinePlan({ clips, listingId: "listing-1", seedKey: "seed-1" });

    expect(first).toEqual(second);
    expect(first.id).toBe("plan-seed-1");
  });

  it("applies minimum duration and includes transition duration in total", () => {
    const minDurationClips: PreviewTimelineClip[] = [
      { id: "x", durationSeconds: 1, isPriorityCategory: false },
      { id: "y", durationSeconds: 1, isPriorityCategory: false }
    ];

    const plan = buildPreviewTimelinePlan({
      clips: minDurationClips,
      listingId: "listing-2",
      transitionDurationSeconds: 0.5,
      seedKey: "seed-min"
    });

    expect(plan.segments).toHaveLength(2);
    for (const segment of plan.segments) {
      expect(segment.durationSeconds).toBeGreaterThanOrEqual(2);
    }

    const baseDuration = plan.segments.reduce((acc, segment) => acc + segment.durationSeconds, 0);
    expect(plan.totalDurationSeconds).toBe(Number((baseDuration + 0.5).toFixed(2)));
  });

  it("builds series and variants with stable ids", () => {
    const series = buildPreviewTimelinePlans(clips, "listing-3", 3, "batch");
    expect(series.map((plan) => plan.id)).toEqual(["plan-batch-1", "plan-batch-2", "plan-batch-3"]);

    const variants = buildPreviewTimelineVariants(clips, "listing-3");
    expect(variants).toHaveLength(3);
    expect(variants.map((plan) => plan.id)).toEqual(["plan-series-1", "plan-series-2", "plan-series-3"]);
  });

  it("returns empty plan series when inputs are empty or count is invalid", () => {
    expect(buildPreviewTimelinePlans([], "listing-4", 3)).toEqual([]);
    expect(buildPreviewTimelinePlans(clips, "listing-4", 0)).toEqual([]);
  });
});
