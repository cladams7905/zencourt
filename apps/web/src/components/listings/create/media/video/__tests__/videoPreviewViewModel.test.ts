import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { PreviewTimelinePlan } from "@web/src/components/listings/create/domain/previewTimeline";
import { buildPlayablePreviews } from "@web/src/components/listings/create/media/video/videoPreviewViewModel";

jest.mock(
  "@shared/utils",
  () => ({
    hashTextOverlaySeed: (value: string) =>
      Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0),
    pickPreviewTextOverlayVariant: () => ({
      position: "center",
      background: "black",
      font: "serif-classic",
      fontPairing: "classic-clean"
    }),
    pickRichOverlayFontPairing: () => "classic-clean",
    pickRichOverlayPosition: () => "center",
    appendRandomHeaderSuffix: (text: string) => text,
    buildOverlayTemplateLines: (
      textOverlay:
        | {
            headline?: string | null;
            accent_top?: string | null;
            accent_bottom?: string | null;
          }
        | null
        | undefined,
      plainText: string,
      forcePattern?: "simple"
    ) => {
      const pattern =
        forcePattern ??
        (textOverlay?.accent_top || textOverlay?.accent_bottom
          ? "sandwich"
          : "simple");
      const headline = textOverlay?.headline ?? plainText;
      if (pattern === "sandwich") {
        return {
          pattern,
          lines: [
            { text: textOverlay?.accent_top ?? "", fontRole: "accent" },
            { text: headline, fontRole: "headline" },
            { text: textOverlay?.accent_bottom ?? "", fontRole: "accent" }
          ]
        };
      }
      return {
        pattern: "simple",
        lines: [{ text: headline, fontRole: "body" }]
      };
    }
  }),
  { virtual: true }
);

jest.mock(
  "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition",
  () => ({
    getTimelineDurationInFrames: (
      segments: Array<{ durationSeconds: number }>,
      fps: number
    ) =>
      segments.reduce(
        (sum, segment) =>
          sum + Math.max(1, Math.round(segment.durationSeconds * fps)),
        0
      )
  })
);

describe("videoPreviewViewModel", () => {
  const basePlans: PreviewTimelinePlan[] = [
    {
      id: "plan-1",
      totalDurationSeconds: 5,
      segments: [
        {
          clipId: "clip-1",
          category: "kitchen",
          durationSeconds: 2
        },
        {
          clipId: "clip-2",
          category: "exterior",
          durationSeconds: 3
        }
      ]
    }
  ];

  const baseItems: ContentItem[] = [
    {
      id: "clip-1",
      videoUrl: "https://video/1.mp4",
      thumbnail: "https://img/1.jpg"
    },
    {
      id: "clip-2",
      videoUrl: "https://video/2.mp4",
      thumbnail: "https://img/2.jpg"
    }
  ];

  it("returns playable previews only when at least two video segments resolve", () => {
    const result = buildPlayablePreviews({
      plans: [
        {
          id: "plan-with-missing-video",
          totalDurationSeconds: 4,
          segments: [
            { clipId: "clip-1", category: "kitchen", durationSeconds: 2 },
            {
              clipId: "clip-missing",
              category: "living room",
              durationSeconds: 2
            }
          ]
        }
      ],
      items: baseItems,
      captionItems: [{ id: "cap-1", hook: "Nice home" } as ContentItem],
      listingSubcategory: "status_update",
      listingAddress: null,
      openHouseContext: null,
      previewFps: 30
    });

    expect(result).toEqual([]);
  });

  it("builds preview overlays and computes timeline duration", () => {
    const result = buildPlayablePreviews({
      plans: basePlans,
      items: baseItems,
      captionItems: [
        {
          id: "cap-1",
          hook: "Luxury home",
          body: [
            { header: "Fresh interiors", content: "Bright and open spaces" }
          ]
        } as ContentItem
      ],
      listingSubcategory: "status_update",
      listingAddress: "123 Main St, Austin, TX 78701",
      openHouseContext: null,
      previewFps: 30
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.durationInFrames).toBe(150);
    expect(result[0]?.resolvedSegments).toHaveLength(2);
    expect(result[0]?.thumbnailOverlay).not.toBeNull();
    expect(result[0]?.firstThumb).toBe("https://img/1.jpg");
  });

  it("adds supplemental address overlay for new listings when slide lacks address", () => {
    const result = buildPlayablePreviews({
      plans: basePlans,
      items: baseItems,
      captionItems: [
        {
          id: "cap-1",
          hook: "Your dream home",
          body: [{ header: "Updated kitchen", content: "Quartz counters" }]
        } as ContentItem
      ],
      listingSubcategory: "new_listing",
      listingAddress: "123 Main St, Austin, TX 78701",
      openHouseContext: null,
      previewFps: 30
    });

    expect(
      result[0]?.resolvedSegments[0]?.supplementalAddressOverlay
    ).toBeDefined();
    expect(
      result[0]?.resolvedSegments[0]?.supplementalAddressOverlay?.overlay.text
    ).toContain("123 Main St");
  });

  it("does not add supplemental address overlay when header already includes address", () => {
    const result = buildPlayablePreviews({
      plans: basePlans,
      items: baseItems,
      captionItems: [
        {
          id: "cap-1",
          body: [{ header: "Tour 123 Main St today", content: "Open layout" }]
        } as ContentItem
      ],
      listingSubcategory: "new_listing",
      listingAddress: "123 Main St, Austin, TX 78701",
      openHouseContext: null,
      previewFps: 30
    });

    expect(
      result[0]?.resolvedSegments.some(
        (segment) => segment.supplementalAddressOverlay
      )
    ).toBe(false);
  });

  it("uses simple overlay template when forced", () => {
    const result = buildPlayablePreviews({
      plans: basePlans,
      items: baseItems,
      captionItems: [
        {
          id: "cap-1",
          body: [
            {
              header: "Headline",
              content: "Body",
              text_overlay: {
                headline: "Headline",
                accent_top: "Top",
                accent_bottom: "Bottom"
              }
            }
          ]
        } as ContentItem
      ],
      listingSubcategory: "status_update",
      listingAddress: null,
      openHouseContext: null,
      forceSimpleOverlayTemplate: true,
      previewFps: 30
    });

    expect(result[0]?.resolvedSegments[0]?.textOverlay?.templatePattern).toBe(
      "simple"
    );
  });

  it("adds supplemental schedule/address overlay for open_house when slide lacks logistics", () => {
    const result = buildPlayablePreviews({
      plans: basePlans,
      items: baseItems,
      captionItems: [
        {
          id: "cap-1",
          hook: "Open house this weekend",
          body: [{ header: "Spacious layout", content: "Updated finishes" }]
        } as ContentItem
      ],
      listingSubcategory: "open_house",
      listingAddress: "123 Main St, Austin, TX 78701",
      openHouseContext: {
        hasAnyEvent: true,
        hasSchedule: true,
        selectedEvent: {
          date: "2026-03-01",
          startTime: "13:00",
          endTime: "15:00",
          dateLabel: "Mar 1st",
          timeLabel: "1-3PM",
          dateTimeLabel: "Mar 1st, 1-3PM"
        },
        openHouseDateTimeLabel: "Mar 1st, 1-3PM",
        openHouseOverlayLabel: "Mar 1st, 1-3PM",
        listingAddressLine: "123 Main St, Austin, TX 78701"
      },
      previewFps: 30
    });

    expect(
      result[0]?.resolvedSegments[0]?.supplementalAddressOverlay?.overlay.text
    ).toContain("Mar 1st, 1-3PM");
    expect(
      result[0]?.resolvedSegments[0]?.supplementalAddressOverlay?.overlay.text
    ).toContain("123 Main St");
  });

  it("does not add open_house supplemental overlay when slide already includes logistics", () => {
    const result = buildPlayablePreviews({
      plans: basePlans,
      items: baseItems,
      captionItems: [
        {
          id: "cap-1",
          body: [
            {
              header: "Join us Mar 1st, 1-3PM at 123 Main St",
              content: "See you there"
            }
          ]
        } as ContentItem
      ],
      listingSubcategory: "open_house",
      listingAddress: "123 Main St, Austin, TX 78701",
      openHouseContext: {
        hasAnyEvent: true,
        hasSchedule: true,
        selectedEvent: {
          date: "2026-03-01",
          startTime: "13:00",
          endTime: "15:00",
          dateLabel: "Mar 1st",
          timeLabel: "1-3PM",
          dateTimeLabel: "Mar 1st, 1-3PM"
        },
        openHouseDateTimeLabel: "Mar 1st, 1-3PM",
        openHouseOverlayLabel: "Mar 1st, 1-3PM",
        listingAddressLine: "123 Main St, Austin, TX 78701"
      },
      previewFps: 30
    });

    expect(
      result[0]?.resolvedSegments.some(
        (segment) => segment.supplementalAddressOverlay
      )
    ).toBe(false);
  });

  it("uses address-only supplemental overlay for open_house when schedule is missing", () => {
    const result = buildPlayablePreviews({
      plans: basePlans,
      items: baseItems,
      captionItems: [
        {
          id: "cap-1",
          body: [{ header: "Tour this home", content: "Open concept" }]
        } as ContentItem
      ],
      listingSubcategory: "open_house",
      listingAddress: "123 Main St, Austin, TX 78701",
      openHouseContext: {
        hasAnyEvent: true,
        hasSchedule: false,
        selectedEvent: null,
        openHouseDateTimeLabel: "",
        openHouseOverlayLabel: "",
        listingAddressLine: "123 Main St, Austin, TX 78701"
      },
      previewFps: 30
    });

    expect(
      result[0]?.resolvedSegments[0]?.supplementalAddressOverlay?.overlay.text
    ).toBe("📍 123 Main St");
  });
});
