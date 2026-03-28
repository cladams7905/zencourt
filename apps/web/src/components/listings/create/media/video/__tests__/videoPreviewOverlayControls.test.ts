import {
  applyOverlayDraftToSegments,
  seedOverlayDraftFromPreview,
  VIDEO_PREVIEW_OVERLAY_BACKGROUND_OPTIONS,
  VIDEO_PREVIEW_OVERLAY_FONT_OPTIONS,
  VIDEO_PREVIEW_OVERLAY_POSITION_OPTIONS
} from "@web/src/components/listings/create/media/video/videoPreviewOverlayControls";
import type { PlayablePreview } from "@web/src/components/listings/create/shared/types";
import type { TimelinePreviewResolvedSegment } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";

function createPreview(overrides?: Partial<PlayablePreview>): PlayablePreview {
  return {
    id: "preview-1",
    resolvedSegments: [
      {
        clipId: "clip-1",
        src: "https://video/1.mp4",
        thumbnailSrc: "https://img/1.jpg",
        category: "kitchen",
        durationSeconds: 3,
        maxDurationSeconds: 4,
        textOverlay: {
          text: "Shared hook",
          position: "center",
          background: "black",
          font: "sans-modern",
          templatePattern: "simple",
          lines: [{ text: "Shared hook", fontRole: "body" }],
          fontPairing: "contemporary-script"
        },
        supplementalAddressOverlay: {
          placement: "below-primary",
          overlay: {
            text: "📍 123 Main St",
            position: "bottom-third",
            background: "black",
            font: "sans-modern",
            templatePattern: "simple",
            lines: [{ text: "📍 123 Main St", fontRole: "body" }],
            fontPairing: "contemporary-script"
          }
        }
      },
      {
        clipId: "clip-2",
        src: "https://video/2.mp4",
        thumbnailSrc: "https://img/2.jpg",
        category: "living_room",
        durationSeconds: 4,
        maxDurationSeconds: 5,
        textOverlay: {
          text: "Shared hook",
          position: "center",
          background: "black",
          font: "sans-modern",
          templatePattern: "simple",
          lines: [{ text: "Shared hook", fontRole: "body" }],
          fontPairing: "contemporary-script"
        }
      }
    ],
    thumbnailOverlay: null,
    thumbnailAddressOverlay: null,
    firstThumb: "https://img/1.jpg",
    durationInFrames: 210,
    captionItem: {
      id: "caption-1",
      hook: "Shared hook",
      caption: "Shared caption"
    } as PlayablePreview["captionItem"],
    variationNumber: 1,
    ...overrides
  };
}

function createPreviewWithoutSupplementalOverlay(): PlayablePreview {
  const preview = createPreview();
  return {
    ...preview,
    resolvedSegments: preview.resolvedSegments.map((segment) => ({
      ...segment,
      supplementalAddressOverlay: undefined
    }))
  };
}

function createPreviewWithoutTextOverlay(): PlayablePreview {
  const preview = createPreview();
  return {
    ...preview,
    resolvedSegments: preview.resolvedSegments.map((segment) => ({
      ...segment,
      textOverlay: undefined
    }))
  };
}

function createPreviewWithMultiLineOverlay(): PlayablePreview {
  const preview = createPreview();
  return {
    ...preview,
    resolvedSegments: preview.resolvedSegments.map((segment, index) =>
      index === 0
        ? {
            ...segment,
            textOverlay: {
              text: "Old hook",
              position: "center",
              background: "black",
              font: "sans-modern",
              templatePattern: "sandwich",
              lines: [
                { text: "Old accent top", fontRole: "accent" },
                { text: "Old headline", fontRole: "headline" },
                { text: "Old accent bottom", fontRole: "accent" }
              ],
              fontPairing: "stacked-serif"
            }
          }
        : segment
    )
  };
}

function cloneSegments(): TimelinePreviewResolvedSegment[] {
  return createPreview().resolvedSegments.map((segment) => ({ ...segment }));
}

describe("videoPreviewOverlayControls", () => {
  it("seeds draft values from the shared overlay and address presence", () => {
    const draft = seedOverlayDraftFromPreview(createPreview());

    expect(draft).toEqual({
      background: "black",
      position: "center",
      fontPairing: "contemporary-script",
      showAddress: true
    });
  });

  it("applies draft overlay styling across all segments and removes address overlays when hidden", () => {
    const segments = cloneSegments();
    const updated = applyOverlayDraftToSegments({
      segments,
      hookText: "Shared hook",
      overlayDraft: {
        background: "brown-700",
        position: "top-third",
        fontPairing: "editorial-clean",
        showAddress: false
      },
      previewContext: createPreview()
    });

    expect(updated).toHaveLength(2);
    expect(updated[0]?.textOverlay).toEqual(
      expect.objectContaining({
        background: "brown-700",
        position: "top-third",
        fontPairing: "editorial-clean"
      })
    );
    expect(updated[1]?.textOverlay).toEqual(
      expect.objectContaining({
        background: "brown-700",
        position: "top-third",
        fontPairing: "editorial-clean"
      })
    );
    expect(updated[0]?.supplementalAddressOverlay).toBeUndefined();
    expect(updated[1]?.supplementalAddressOverlay).toBeUndefined();
  });

  it("preserves supplemental address placement when the segment already has one", () => {
    const updated = applyOverlayDraftToSegments({
      segments: cloneSegments(),
      hookText: "Shared hook",
      overlayDraft: {
        background: "brown-700",
        position: "top-third",
        fontPairing: "editorial-clean",
        showAddress: true
      },
      previewContext: createPreview()
    });

    expect(updated[0]?.supplementalAddressOverlay?.placement).toBe(
      "below-primary"
    );
  });

  it("builds a text overlay from hook text when segments do not already have one", () => {
    const updated = applyOverlayDraftToSegments({
      segments: createPreviewWithoutTextOverlay().resolvedSegments,
      hookText: "Fallback hook",
      overlayDraft: {
        background: "white",
        position: "center",
        fontPairing: "editorial-script",
        showAddress: false
      },
      previewContext: createPreviewWithoutTextOverlay()
    });

    expect(updated[0]?.textOverlay).toEqual(
      expect.objectContaining({
        text: "Fallback hook",
        background: "white",
        position: "center",
        fontPairing: "editorial-script"
      })
    );
  });

  it("regenerates structured lines for a rich template without duplicating hook text", () => {
    const updated = applyOverlayDraftToSegments({
      segments: createPreviewWithMultiLineOverlay().resolvedSegments,
      hookText: "Fresh hook",
      overlayDraft: {
        background: "black",
        position: "center",
        fontPairing: "stacked-modern",
        showAddress: false
      },
      previewContext: createPreviewWithMultiLineOverlay()
    });

    expect(updated[0]?.textOverlay?.text).toBe("Fresh hook");
    expect(updated[0]?.textOverlay?.lines).toEqual([
      { text: "Old accent top", fontRole: "accent" },
      { text: "Fresh hook", fontRole: "headline" },
      { text: "Old accent bottom", fontRole: "accent" }
    ]);
  });

  it("inherits supplemental address overlays from the preview context when showAddress is true", () => {
    const updated = applyOverlayDraftToSegments({
      segments: createPreviewWithoutSupplementalOverlay().resolvedSegments,
      hookText: "Shared hook",
      overlayDraft: {
        background: "brown-500",
        position: "center",
        fontPairing: "contemporary-script",
        showAddress: true
      },
      previewContext: createPreview()
    });

    expect(updated[0]?.supplementalAddressOverlay).toEqual(
      expect.objectContaining({
        placement: "below-primary",
        overlay: expect.objectContaining({
          background: "brown-500",
          position: "center",
          fontPairing: "contemporary-script"
        })
      })
    );
  });

  it("exports user-facing font labels for the internal pairing ids", () => {
    expect(VIDEO_PREVIEW_OVERLAY_BACKGROUND_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "black" }),
        expect.objectContaining({ value: "brown-700" })
      ])
    );
    expect(VIDEO_PREVIEW_OVERLAY_POSITION_OPTIONS).toEqual([
      { value: "top-third", label: "Top" },
      { value: "center", label: "Center" },
      { value: "bottom-third", label: "Bottom" }
    ]);
    expect(VIDEO_PREVIEW_OVERLAY_FONT_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "editorial-script",
          label: "Elegant Serif"
        }),
        expect.objectContaining({
          value: "editorial-clean",
          label: "Editorial Clean"
        }),
        expect.objectContaining({
          value: "contemporary-script",
          label: "Modern Script"
        }),
        expect.objectContaining({
          value: "statement-script",
          label: "Statement Script"
        })
      ])
    );
  });
});
