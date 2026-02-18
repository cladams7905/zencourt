import type {
  ContentItem,
  TextOverlayInput
} from "@web/src/components/dashboard/components/ContentGrid";
import type {
  PreviewTextOverlay,
  PreviewTimelinePlan
} from "@web/src/lib/domain/listing/previewTimeline";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  hashTextOverlaySeed,
  pickPreviewTextOverlayVariant,
  pickRichOverlayFontPairing,
  pickRichOverlayPosition,
  buildOverlayTemplateLines,
  appendRandomHeaderSuffix,
  type OverlayVariant
} from "@shared/utils";
import {
  getTimelineDurationInFrames,
  type TimelinePreviewResolvedSegment
} from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";
import type { PlayablePreview } from "@web/src/components/listings/create/shared/types";

const LOCATION_EMOJI = "📍";

interface SlideOverlayData {
  plainText: string;
  textOverlay?: TextOverlayInput | null;
}

function getSlideOverlayData(
  captionItem: ContentItem | null
): SlideOverlayData[] {
  const slides = captionItem?.body ?? [];
  const data: SlideOverlayData[] = slides
    .filter((slide) => slide.header?.trim())
    .map((slide) => ({
      plainText: slide.header.trim(),
      textOverlay: slide.text_overlay ?? null
    }));

  if (data.length > 0) {
    return data;
  }

  const fallback = captionItem?.hook?.trim();
  return fallback ? [{ plainText: fallback }] : [];
}

function normalizeForAddressMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStreetAddress(address: string): string {
  return address.split(",")[0]?.trim() ?? "";
}

function slideContainsAddress(
  slideData: SlideOverlayData,
  normalizedAddress: string
): boolean {
  const parts = [
    slideData.plainText,
    slideData.textOverlay?.headline ?? "",
    slideData.textOverlay?.accent_top ?? "",
    slideData.textOverlay?.accent_bottom ?? ""
  ];

  return parts.some((value) =>
    normalizeForAddressMatch(value).includes(normalizedAddress)
  );
}

function buildAddressSupplementalOverlay(
  primaryOverlay: PreviewTextOverlay,
  listingAddress: string
): TimelinePreviewResolvedSegment["supplementalAddressOverlay"] {
  const addressText = `${LOCATION_EMOJI} ${listingAddress.trim()}`;
  const shouldPushLower =
    primaryOverlay.templatePattern !== "simple" ||
    primaryOverlay.position === "top-third";

  return {
    placement: shouldPushLower
      ? "low-bottom"
      : primaryOverlay.position === "top-third"
        ? "bottom-third"
        : "below-primary",
    overlay: {
      text: addressText,
      position: "bottom-third",
      background:
        primaryOverlay.templatePattern === "simple" &&
        primaryOverlay.background === "none"
          ? "none"
          : primaryOverlay.background === "none"
            ? "black"
            : primaryOverlay.background,
      font: primaryOverlay.font,
      templatePattern: "simple",
      lines: [{ text: addressText, fontRole: "body" }],
      fontPairing: primaryOverlay.fontPairing
    }
  };
}

function buildRichOverlay(
  slideData: SlideOverlayData,
  variant: OverlayVariant,
  options?: { forceSimpleTemplate?: boolean }
): PreviewTextOverlay {
  const textOverlay = slideData.textOverlay;
  const normalizedOverlay = options?.forceSimpleTemplate
    ? {
        headline: textOverlay?.headline ?? slideData.plainText,
        accent_top: null,
        accent_bottom: null
      }
    : textOverlay;

  const { pattern: templatePattern, lines } = buildOverlayTemplateLines(
    normalizedOverlay,
    slideData.plainText,
    options?.forceSimpleTemplate ? "simple" : undefined
  );

  const isRichTemplate = templatePattern !== "simple";
  const simpleSeedBase = `${slideData.plainText}:${normalizedOverlay?.headline ?? "simple"}:${variant.position}:${variant.fontPairing}`;
  const richSeedBase = `${slideData.plainText}:${normalizedOverlay?.headline ?? "rich"}:${variant.position}`;
  const brownBackgroundOptions: PreviewTextOverlay["background"][] = [
    "brown",
    "brown-700",
    "brown-500",
    "brown-300",
    "brown-200",
    "brown-100"
  ];

  const simpleBackgroundBucket =
    hashTextOverlaySeed(`${simpleSeedBase}:bg-bucket`) % 3;
  const simpleBackground: PreviewTextOverlay["background"] =
    simpleBackgroundBucket === 0
      ? "none"
      : simpleBackgroundBucket === 1
        ? "black"
        : (brownBackgroundOptions[
            hashTextOverlaySeed(`${simpleSeedBase}:bg-brown`) %
              brownBackgroundOptions.length
          ] ?? "brown");

  const simplePositionOptions: PreviewTextOverlay["position"][] = [
    "top-third",
    "center",
    "bottom-third"
  ];
  const simplePosition =
    simplePositionOptions[
      hashTextOverlaySeed(`${simpleSeedBase}:position`) %
        simplePositionOptions.length
    ] ?? variant.position;

  const makeSimpleSuffixRandom = () => {
    const values = [
      hashTextOverlaySeed(`${simpleSeedBase}:suffix-bucket`) / 0x100000000,
      hashTextOverlaySeed(`${simpleSeedBase}:suffix-emoji`) / 0x100000000
    ];
    let index = 0;
    return () => {
      const value = values[Math.min(index, values.length - 1)] ?? 0;
      index += 1;
      return value;
    };
  };

  const resolvedLines =
    templatePattern === "simple"
      ? lines.map((line, index) =>
          index === 0
            ? {
                ...line,
                text: appendRandomHeaderSuffix(line.text, {
                  random: makeSimpleSuffixRandom()
                })
              }
            : line
        )
      : lines;

  return {
    text: slideData.plainText,
    position:
      templatePattern === "simple"
        ? simplePosition
        : pickRichOverlayPosition(richSeedBase),
    background: isRichTemplate ? "none" : simpleBackground,
    font: variant.font,
    templatePattern,
    lines: resolvedLines,
    fontPairing:
      templatePattern === "simple"
        ? variant.fontPairing
        : pickRichOverlayFontPairing(richSeedBase)
  };
}

export function buildPlayablePreviews(params: {
  plans: PreviewTimelinePlan[];
  items: ContentItem[];
  captionItems: ContentItem[];
  listingSubcategory: ListingContentSubcategory;
  listingAddress: string | null;
  forceSimpleOverlayTemplate?: boolean;
  previewFps: number;
  previewTransitionSeconds: number;
}): PlayablePreview[] {
  const itemById = new Map(
    params.items.map((item) => [
      item.id,
      {
        id: item.id,
        videoUrl: item.videoUrl ?? null,
        thumbnail: item.thumbnail ?? null
      }
    ])
  );

  const listingStreetAddress = extractStreetAddress(
    params.listingAddress ?? ""
  );
  const normalizedListingAddress =
    normalizeForAddressMatch(listingStreetAddress);
  const shouldEnforceAddressOverlay =
    params.listingSubcategory === "new_listing" &&
    normalizedListingAddress.length > 0;

  const resolved = params.plans.map<PlayablePreview | null>((plan, index) => {
    const resolvedSegments: TimelinePreviewResolvedSegment[] = plan.segments
      .map((segment) => {
        const source = itemById.get(segment.clipId);
        if (!source?.videoUrl) {
          return null;
        }
        return {
          ...segment,
          src: source.videoUrl
        };
      })
      .filter((segment): segment is TimelinePreviewResolvedSegment =>
        Boolean(segment)
      );

    if (resolvedSegments.length < 2) {
      return null;
    }

    const captionItem = params.captionItems.at(index) ?? null;
    const slideOverlayData = getSlideOverlayData(captionItem);
    const seed = `${plan.id}:${captionItem?.id ?? "no-caption"}`;
    const overlayVariant = pickPreviewTextOverlayVariant(seed);

    const segmentsWithOverlays = resolvedSegments.map(
      (segment, segmentIndex) => {
        const data = slideOverlayData.length
          ? slideOverlayData[segmentIndex % slideOverlayData.length]
          : undefined;

        if (!data) {
          return segment;
        }

        const primaryOverlay = buildRichOverlay(data, overlayVariant, {
          forceSimpleTemplate: params.forceSimpleOverlayTemplate
        });

        const needsAddressSupplement =
          shouldEnforceAddressOverlay &&
          !slideContainsAddress(data, normalizedListingAddress) &&
          Boolean(params.listingAddress?.trim());

        return {
          ...segment,
          textOverlay: primaryOverlay,
          supplementalAddressOverlay: needsAddressSupplement
            ? buildAddressSupplementalOverlay(
                primaryOverlay,
                listingStreetAddress
              )
            : undefined
        };
      }
    );

    const firstThumb =
      itemById.get(resolvedSegments[0].clipId)?.thumbnail ?? null;
    const firstSegmentWithOverlay = segmentsWithOverlays.find(
      (segment) => segment.textOverlay
    );
    const thumbnailOverlay = firstSegmentWithOverlay?.textOverlay ?? null;
    const thumbnailAddressOverlay =
      firstSegmentWithOverlay?.supplementalAddressOverlay ?? null;
    const durationInFrames = getTimelineDurationInFrames(
      segmentsWithOverlays,
      params.previewFps,
      params.previewTransitionSeconds
    );

    return {
      id: `${plan.id}-${resolvedSegments.length}`,
      resolvedSegments: segmentsWithOverlays,
      thumbnailOverlay,
      thumbnailAddressOverlay,
      firstThumb,
      durationInFrames,
      captionItem,
      variationNumber: index + 1
    };
  });

  return resolved.filter((plan): plan is PlayablePreview => Boolean(plan));
}
