import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  OverlayFontPairing,
  PreviewTextOverlayBackground,
  PreviewTextOverlayPosition
} from "@shared/types/video";

// --- Tabs & taxonomy (dashboard / filters) ---

export type ListingContentMediaTab = "videos" | "images";

export type ListingContentType = "videos" | "posts" | "stories";

export type ContentCategory =
  | "listing"
  | "market_insights"
  | "educational"
  | "community"
  | "lifestyle"
  | "seasonal";

export type ContentFilterLabel =
  | "Listings"
  | "Market Insights"
  | "Educational"
  | "Community"
  | "Lifestyle"
  | "Seasonal";

// --- Media & provenance ---

export type ListingAspectRatio = "square" | "vertical" | "horizontal";
export type ListingGenerationModel =
  | "gen4.5"
  | "veo3.1_fast"
  | "runway-gen4-turbo"
  | "kling1.6";
export type ListingMediaType = "video" | "image";

/** Unsaved preview rows come from Redis cache (`cached_content`); persisted reels use `saved_content`. */
export type ListingContentSource = "cached_content" | "saved_content";

// --- Reels (sequence + text overlays) ---

export type ReelClipSourceType = "listing_clip" | "user_media";

export type ReelSequenceItem = {
  sourceType: ReelClipSourceType;
  sourceId: string;
  durationSeconds: number;
};

export type ReelOverlaySettings = {
  overlayBackground?: PreviewTextOverlayBackground | null;
  overlayPosition?: PreviewTextOverlayPosition | null;
  overlayFontPairing?: OverlayFontPairing | null;
  showAddress?: boolean | null;
};

// --- Carousel / image story slides ---

export type TextOverlayInput = {
  accent_top?: string | null;
  headline: string;
  accent_bottom?: string | null;
};

export type CarouselSlide = {
  header: string;
  content: string;
  broll_query?: string | null;
  text_overlay?: TextOverlayInput | null;
};

// --- Primary listing content row (API + UI) ---

export type ListingContentItem = ReelOverlaySettings & {
  id: string;
  clipVersionId?: string;
  thumbnail?: string;
  videoUrl?: string | null;
  aspectRatio?: ListingAspectRatio;
  isFavorite?: boolean;
  alt?: string;
  hook?: string;
  caption?: string | null;
  body?: CarouselSlide[] | null;
  brollQuery?: string | null;
  category?: string | null;
  durationSeconds?: number | null;
  generationModel?: ListingGenerationModel | null;
  orientation?: "vertical" | "landscape" | null;
  isPriorityCategory?: boolean;
  listingSubcategory?: ListingContentSubcategory | null;
  mediaType?: ListingMediaType | null;
  roomId?: string | null;
  roomName?: string | null;
  clipIndex?: number | null;
  sortOrder?: number | null;
  prompt?: string | null;
  versionNumber?: number | null;
  isCurrentVersion?: boolean;
  versionStatus?: "pending" | "processing" | "completed" | "failed" | "canceled";
  generatedAt?: string | Date | null;
  orderedClipIds?: string[] | null;
  clipDurationOverrides?: Record<string, number> | null;
  contentSource?: ListingContentSource;
  savedContentId?: string;
  reelSequence?: ReelSequenceItem[] | null;
  reelClipSource?: ReelClipSourceType;
};

export type ListingGeneratedContentState = Record<
  ListingContentType,
  Record<ContentCategory, ListingContentItem[]>
>;

// --- LLM stream (caption / body generation) ---

export type ListingContentStreamItem = {
  hook: string;
  body?: { header: string; content: string; broll_query?: string | null }[] | null;
  caption?: string | null;
  broll_query?: string | null;
};

export type ListingContentGenerationEvent =
  | { type: "delta"; text: string }
  | { type: "done"; items: ListingContentStreamItem[] }
  | { type: "error"; message: string };

// --- Playable reel preview (cache vs saved) ---

/** Unsaved playable preview keyed by listing content cache (not yet saved to DB). */
export type PlayablePreviewCaptionItemKey = {
  contentSource: "cached_content";
  cacheKeyTimestamp: number;
  cacheKeyId: number;
  subcategory: ListingContentSubcategory;
  mediaType: "video";
};

export type PlayablePreviewSavedContentKey = {
  contentSource: "saved_content";
  savedContentId: string;
};

export type PlayablePreviewSaveTarget =
  | PlayablePreviewCaptionItemKey
  | PlayablePreviewSavedContentKey;

export type PlayablePreviewTextUpdate = {
  hook: string;
  caption: string;
  overlayBackground: PreviewTextOverlayBackground;
  overlayPosition: PreviewTextOverlayPosition;
  overlayFontPairing: OverlayFontPairing;
  showAddress: boolean;
  orderedClipIds: string[];
  clipDurationOverrides: Record<string, number>;
  sequence: ReelSequenceItem[];
  saveTarget: PlayablePreviewSaveTarget;
};
