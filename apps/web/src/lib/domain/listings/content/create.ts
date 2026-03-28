import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  OverlayFontPairing,
  PreviewTextOverlayBackground,
  PreviewTextOverlayPosition
} from "@shared/types/video";
import type { ReelSequenceItem } from "./index";

export type ListingCreateMediaTab = "videos" | "images";

export type PlayablePreviewCaptionItemKey = {
  contentSource: "cached_create";
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

export const LISTING_CREATE_INITIAL_PAGE_SIZE = 8;
