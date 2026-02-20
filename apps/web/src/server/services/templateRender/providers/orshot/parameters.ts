import type { DBListing, DBListingImage, DBUserAdditional } from "@db/types/models";
import type { ListingContentSubcategory, ListingPropertyDetails } from "@shared/types/models";
import { PREVIEW_TEXT_OVERLAY_ARROW_PATHS } from "@shared/utils";
import { isPriorityCategory } from "@shared/utils";
import type {
  TemplateRenderCaptionItemInput,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";
import {
  formatCurrencyUsd,
  formatNumberUs,
  formatCountWithNoun
} from "@web/src/lib/core/formatting/number";

function toOrdinal(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatPlaceholderOpenHouseDateTime(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${month} ${toOrdinal(date.getDate())}, 7-10AM`;
}

function splitHeaderText(headerText: string): {
  headerTextTop: string;
  headerTextBottom: string;
} {
  const words = headerText.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return {
      headerTextTop: headerText,
      headerTextBottom: ""
    };
  }

  const midpoint = Math.ceil(words.length / 2);
  return {
    headerTextTop: words.slice(0, midpoint).join(" "),
    headerTextBottom: words.slice(midpoint).join(" ")
  };
}

function pickRandomArrowPath(
  siteOrigin?: string | null,
  random: () => number = Math.random
): string {
  const index = Math.floor(random() * PREVIEW_TEXT_OVERLAY_ARROW_PATHS.length);
  const arrowPath = PREVIEW_TEXT_OVERLAY_ARROW_PATHS[index] ?? PREVIEW_TEXT_OVERLAY_ARROW_PATHS[0];
  if (!arrowPath) {
    return "";
  }
  if (!siteOrigin) {
    return arrowPath;
  }
  try {
    return new URL(arrowPath, siteOrigin).toString();
  } catch {
    return arrowPath;
  }
}

function rankListingImagesForTemplate(
  images: DBListingImage[],
  captionItem: TemplateRenderCaptionItemInput
): string[] {
  const needle = `${captionItem.hook ?? ""} ${captionItem.caption ?? ""} ${captionItem.body
    .map((slide) => `${slide.header} ${slide.content}`)
    .join(" ")}`
    .toLowerCase()
    .replace(/[^\w\s]/g, " ");

  const sorted = [...images].sort((a, b) => {
    const aPriority = a.category && isPriorityCategory(a.category) ? 1 : 0;
    const bPriority = b.category && isPriorityCategory(b.category) ? 1 : 0;
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    const aPrimary = a.isPrimary ? 1 : 0;
    const bPrimary = b.isPrimary ? 1 : 0;
    if (aPrimary !== bPrimary) {
      return bPrimary - aPrimary;
    }

    const aCategoryMatch = a.category && needle.includes(a.category.toLowerCase()) ? 1 : 0;
    const bCategoryMatch = b.category && needle.includes(b.category.toLowerCase()) ? 1 : 0;
    if (aCategoryMatch !== bCategoryMatch) {
      return bCategoryMatch - aCategoryMatch;
    }

    const aScore = typeof a.primaryScore === "number" ? a.primaryScore : -Infinity;
    const bScore = typeof b.primaryScore === "number" ? b.primaryScore : -Infinity;
    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return b.uploadedAt.getTime() - a.uploadedAt.getTime();
  });

  return sorted.map((image) => image.url);
}

function resolveHeaderTag(subcategory: ListingContentSubcategory): string {
  if (subcategory === "new_listing") {
    return "listed";
  }
  if (subcategory === "status_update") {
    return "sold";
  }
  return "";
}

function compactList(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim() ?? "").filter((value) => value.length > 0);
}

function pickPropertyDetails(listing: DBListing): ListingPropertyDetails | null {
  const details = listing.propertyDetails as ListingPropertyDetails | null;
  return details ?? null;
}

export function resolveTemplateParameters(params: {
  subcategory: ListingContentSubcategory;
  listing: DBListing;
  listingImages: DBListingImage[];
  userAdditional: DBUserAdditional;
  captionItem: TemplateRenderCaptionItemInput;
  siteOrigin?: string | null;
  random?: () => number;
  now?: Date;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const details = pickPropertyDetails(params.listing);
  const images = rankListingImagesForTemplate(
    params.listingImages,
    params.captionItem
  );
  const random = params.random ?? Math.random;
  const now = params.now ?? new Date();

  const fallbackHeader = params.captionItem.hook?.trim() || "Just listed";
  const { headerTextTop, headerTextBottom } = splitHeaderText(fallbackHeader);
  const bedCount = formatCountWithNoun(details?.bedrooms, "bed");
  const bathCount = formatCountWithNoun(details?.bathrooms, "bath");
  const squareFootageRaw =
    typeof details?.living_area_sq_ft === "number"
      ? `${formatNumberUs(details.living_area_sq_ft)} sqft`
      : "";

  const listingPrice = formatCurrencyUsd(details?.listing_price ?? null, "$0");
  const priceLabel = params.subcategory === "status_update" ? "sold for" : "starting from";

  const featureItems = compactList([
    bedCount,
    bathCount,
    squareFootageRaw,
    ...(details?.living_spaces ?? []),
    ...(details?.additional_spaces ?? []),
    details?.architecture ?? null
  ]);

  const realtorName = params.userAdditional.agentName?.trim() || "Your Realtor";
  const realtorTitle = params.userAdditional.agentTitle?.trim() || "Realtor";
  const brokerageName = params.userAdditional.brokerageName?.trim() || "Your Brokerage";

  const realtorContact1 = "(555) 555-0199";
  const realtorContact2 = "www.example-realty.com";
  const realtorContact3 = `${realtorTitle} · ${brokerageName}`;

  return {
    headerText: fallbackHeader,
    headerTag: resolveHeaderTag(params.subcategory),
    headerTextTop,
    headerTextBottom,
    subheader1Text: params.captionItem.body[0]?.header ?? "",
    subheader2Text: params.captionItem.body[1]?.header ?? "",
    arrowImage: pickRandomArrowPath(params.siteOrigin, random),
    bedCount,
    bathCount,
    garageCount: "",
    squareFootage: squareFootageRaw,
    listingPrice,
    priceLabel,
    priceDescription: `${priceLabel} ${listingPrice}`,
    propertyDescription: params.captionItem.caption?.trim() || "",
    backgroundImage1: images[0] ?? "",
    backgroundImage2: images[1] ?? "",
    backgroundImage3: images[2] ?? "",
    backgroundImage4: images[3] ?? "",
    backgroundImage5: images[4] ?? "",
    listingAddress:
      details?.address?.trim() || params.listing.address?.trim() || params.listing.title?.trim() || "",
    feature1: featureItems[0] ?? "",
    feature2: featureItems[1] ?? "",
    feature3: featureItems[2] ?? "",
    featureList: featureItems.join(" • "),
    openHouseDateTime: formatPlaceholderOpenHouseDateTime(now),
    socialHandle: "@zencourt_realtor",
    realtorName,
    realtorProfileImage: params.userAdditional.headshotUrl?.trim() || "",
    realtorContactInfo: [realtorContact1, realtorContact2, realtorContact3].join(" • "),
    realtorContact1,
    realtorContact2,
    realtorContact3
  };
}
