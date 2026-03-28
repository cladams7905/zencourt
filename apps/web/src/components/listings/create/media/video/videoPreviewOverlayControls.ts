import type { PlayablePreview } from "@web/src/components/listings/create/shared/types";
import type { OverlayLine, PreviewTextOverlay } from "@shared/types/video";
import { buildOverlayTemplateLines } from "@shared/utils";
import type { TimelinePreviewResolvedSegment } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";

export type ReelOverlayDraft = {
  background: PreviewTextOverlay["background"];
  position: PreviewTextOverlay["position"];
  fontPairing: NonNullable<PreviewTextOverlay["fontPairing"]>;
  showAddress: boolean;
};

export type OverlayOption<TValue extends string> = {
  value: TValue;
  label: string;
};

export const VIDEO_PREVIEW_OVERLAY_BACKGROUND_OPTIONS = [
  { value: "black", label: "Black" },
  { value: "brown", label: "Brown" },
  { value: "brown-700", label: "Brown 700" },
  { value: "brown-500", label: "Brown 500" },
  { value: "brown-300", label: "Brown 300" },
  { value: "brown-200", label: "Brown 200" },
  { value: "brown-100", label: "Brown 100" },
  { value: "white", label: "White" },
  { value: "transparent", label: "Transparent" }
] as const satisfies readonly OverlayOption<PreviewTextOverlay["background"]>[];

export const VIDEO_PREVIEW_OVERLAY_POSITION_OPTIONS = [
  { value: "top-third", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom-third", label: "Bottom" }
] as const satisfies readonly OverlayOption<PreviewTextOverlay["position"]>[];

export const VIDEO_PREVIEW_OVERLAY_FONT_OPTIONS = [
  { value: "editorial-script", label: "Elegant Serif" },
  { value: "editorial-clean", label: "Editorial Clean" },
  { value: "contemporary-script", label: "Modern Script" },
  { value: "statement-script", label: "Statement Script" },
  { value: "stacked-accent", label: "Stacked Accent" },
  { value: "stacked-serif", label: "Stacked Serif" },
  { value: "stacked-modern", label: "Stacked Modern" },
  { value: "refined-serif", label: "Refined Serif" },
  { value: "heritage-serif", label: "Heritage Serif" }
] as const satisfies readonly OverlayOption<
  NonNullable<PreviewTextOverlay["fontPairing"]>
>[];

function cloneOverlay(
  overlay: PreviewTextOverlay,
  draft: ReelOverlayDraft
): PreviewTextOverlay {
  return {
    ...overlay,
    background: draft.background,
    position: draft.position,
    fontPairing: draft.fontPairing
  };
}

function applyHookText(
  overlay: PreviewTextOverlay,
  hookText: string
): PreviewTextOverlay {
  const nextLines: OverlayLine[] =
    overlay.lines?.length &&
    overlay.templatePattern &&
    overlay.templatePattern !== "simple"
      ? buildRichOverlayLines(overlay, hookText)
      : overlay.lines?.length
        ? overlay.lines.map((line) => ({ ...line, text: hookText }))
        : [{ text: hookText, fontRole: "body" }];

  return {
    ...overlay,
    text: hookText,
    lines: nextLines
  };
}

function buildRichOverlayLines(
  overlay: PreviewTextOverlay,
  hookText: string
): NonNullable<PreviewTextOverlay["lines"]> {
  const accentLines =
    overlay.lines?.filter((line) => line.fontRole === "accent") ?? [];

  if (overlay.templatePattern === "sandwich") {
    return buildOverlayTemplateLines(
      {
        headline: hookText,
        accent_top: accentLines[0]?.text ?? null,
        accent_bottom: accentLines[1]?.text ?? accentLines[0]?.text ?? null
      },
      hookText,
      "sandwich"
    ).lines;
  }

  if (overlay.templatePattern === "accent-headline") {
    return buildOverlayTemplateLines(
      {
        headline: hookText,
        accent_bottom: accentLines[0]?.text ?? null,
        accent_top: accentLines[0]?.text ?? null
      },
      hookText,
      "accent-headline"
    ).lines;
  }

  return (
    overlay.lines?.map((line) => ({ ...line, text: hookText })) ?? [
      { text: hookText, fontRole: "body" }
    ]
  );
}

function cloneSupplementalAddressOverlay(
  baseOverlay: NonNullable<
    TimelinePreviewResolvedSegment["supplementalAddressOverlay"]
  >,
  draft: ReelOverlayDraft
): TimelinePreviewResolvedSegment["supplementalAddressOverlay"] {
  return {
    ...baseOverlay,
    overlay: {
      ...baseOverlay.overlay,
      background: draft.background,
      position: draft.position,
      fontPairing: draft.fontPairing
    }
  };
}

function getSharedTextOverlay(
  preview: PlayablePreview | null | undefined
): PreviewTextOverlay | null {
  return (
    preview?.resolvedSegments.find((segment) => segment.textOverlay)
      ?.textOverlay ?? null
  );
}

function getSharedSupplementalAddressOverlay(
  preview: PlayablePreview | null | undefined
): TimelinePreviewResolvedSegment["supplementalAddressOverlay"] | null {
  return (
    preview?.resolvedSegments.find(
      (segment) => segment.supplementalAddressOverlay
    )?.supplementalAddressOverlay ?? null
  );
}

function buildFallbackDraft(
  preview: PlayablePreview | null | undefined
): ReelOverlayDraft {
  const textOverlay = getSharedTextOverlay(preview);
  return {
    background: textOverlay?.background ?? "black",
    position: textOverlay?.position ?? "center",
    fontPairing: textOverlay?.fontPairing ?? "editorial-script",
    showAddress: Boolean(getSharedSupplementalAddressOverlay(preview))
  };
}

export function seedOverlayDraftFromPreview(
  preview: PlayablePreview | null | undefined
): ReelOverlayDraft {
  return buildFallbackDraft(preview);
}

export function applyOverlayDraftToSegments(params: {
  segments: TimelinePreviewResolvedSegment[];
  hookText: string;
  overlayDraft: ReelOverlayDraft;
  previewContext?: PlayablePreview | null;
}): TimelinePreviewResolvedSegment[] {
  const sharedSupplementalAddressOverlay = getSharedSupplementalAddressOverlay(
    params.previewContext
  );
  const sharedTextOverlay = getSharedTextOverlay(params.previewContext);

  return params.segments.map((segment) => {
    const sourceTextOverlay = segment.textOverlay ?? sharedTextOverlay ?? null;
    const nextTextOverlay = sourceTextOverlay
      ? applyHookText(
          cloneOverlay(sourceTextOverlay, params.overlayDraft),
          params.hookText
        )
      : applyHookText(
          {
            text: params.hookText,
            position: params.overlayDraft.position,
            background: params.overlayDraft.background,
            font: "sans-modern",
            fontPairing: params.overlayDraft.fontPairing,
            templatePattern: "simple"
          },
          params.hookText
        );
    const baseSupplementalOverlay =
      segment.supplementalAddressOverlay ?? sharedSupplementalAddressOverlay;

    return {
      ...segment,
      textOverlay: nextTextOverlay,
      supplementalAddressOverlay: params.overlayDraft.showAddress
        ? baseSupplementalOverlay
          ? cloneSupplementalAddressOverlay(
              baseSupplementalOverlay,
              params.overlayDraft
            )
          : undefined
        : undefined
    };
  });
}
