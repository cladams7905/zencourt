import type { ListingContentSubcategory } from "@shared/types/models";

export const TEMPLATE_RENDER_PARAMETER_KEYS = [
  "headerText",
  "headerTag",
  "headerTextTop",
  "headerTextBottom",
  "subheader1Text",
  "subheader2Text",
  "arrowImage",
  "bedCount",
  "bathCount",
  "garageCount",
  "squareFootage",
  "listingPrice",
  "priceLabel",
  "garageLabel",
  "priceDescription",
  "propertyDescription",
  "backgroundImage1",
  "backgroundImage2",
  "backgroundImage3",
  "backgroundImage4",
  "backgroundImage5",
  "listingAddress",
  "feature1",
  "feature2",
  "feature3",
  "featureList",
  "openHouseDateTime",
  "socialHandle",
  "socialHandleIcon",
  "agentName",
  "agentTitle",
  "agentProfileImage",
  "agentContactInfo",
  "agentContact1",
  "agentContact2",
  "agentContact3",
  "agencyName"
] as const;

export type TemplateRenderParameterKey =
  (typeof TEMPLATE_RENDER_PARAMETER_KEYS)[number];

export const TEMPLATE_RENDER_PARAMETER_KEY_SET =
  new Set<TemplateRenderParameterKey>(TEMPLATE_RENDER_PARAMETER_KEYS);

export const TEMPLATE_RENDER_IMAGE_PARAMETER_KEYS = [
  "arrowImage",
  "backgroundImage1",
  "backgroundImage2",
  "backgroundImage3",
  "backgroundImage4",
  "backgroundImage5",
  "agentProfileImage"
] as const satisfies readonly TemplateRenderParameterKey[];

export const TEMPLATE_RENDER_IMAGE_PARAMETER_KEY_SET =
  new Set<TemplateRenderParameterKey>(TEMPLATE_RENDER_IMAGE_PARAMETER_KEYS);

export const TEMPLATE_HEADER_LENGTHS = ["short", "medium", "long"] as const;

export type TemplateHeaderLength = (typeof TEMPLATE_HEADER_LENGTHS)[number];

export type TemplateRenderConfig = {
  id: string;
  name: string;
  subcategories: ListingContentSubcategory[];
  requiredParams: TemplateRenderParameterKey[];
  pageLength?: number;
  headerLength?: TemplateHeaderLength;
  forceListingAddressSubheader?: boolean;
  forceUppercaseHeader?: boolean;
  supportsHeaderTag?: boolean;
};

export type TemplateRenderCaptionSlideInput = {
  header: string;
  content: string;
};

export type TemplateRenderCaptionItemInput = {
  id: string;
  hook: string | null;
  caption: string | null;
  broll_query?: string | null;
  cta?: string | null;
  body: TemplateRenderCaptionSlideInput[];
  /** When present, template render API can read/update the unified content cache for this item. */
  cacheKeyTimestamp?: number;
  cacheKeyId?: number;
};

export type TemplateRenderCaptionItemWithCacheKey =
  TemplateRenderCaptionItemInput & {
    cacheKeyTimestamp?: number;
    cacheKeyId?: number;
  };

export type ListingTemplateRenderRequest = {
  listingId: string;
  subcategory: ListingContentSubcategory;
  captionItems: TemplateRenderCaptionItemInput[];
  templateCount?: number;
  siteOrigin?: string | null;
};

export type ListingTemplateRenderedItem = {
  templateId: string;
  imageUrl: string;
  captionItemId: string;
  parametersUsed: Partial<Record<TemplateRenderParameterKey, string>>;
  /** When true, client shows text overlay; when false/absent, template-only display. */
  isFallback?: boolean;
};

export type ListingTemplateRenderResult = {
  items: ListingTemplateRenderedItem[];
  failedTemplateIds: string[];
};
