import type {
  DBListing,
  DBListingImage,
  DBUserAdditional
} from "@db/types/models";
import type {
  ListingContentSubcategory,
  ListingPropertyDetails
} from "@shared/types/models";
import {
  PREVIEW_TEXT_OVERLAY_ARROW_PATHS,
  buildStoragePublicUrl
} from "@shared/utils";
import { isPriorityCategory } from "@shared/utils";
import { resolveListingOpenHouseContext } from "@web/src/lib/domain/listings/openHouse";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type {
  TemplateRenderCaptionItemInput,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";
import {
  formatCurrencyUsd,
  formatNumberUs
} from "@web/src/lib/core/formatting/number";
import type { TemplateImageRotationStore } from "@web/src/server/services/templateRender/rotation";

const logger = createChildLogger(baseLogger, {
  module: "template-render-orshot-parameters"
});

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

function pickRandomArrowPath(random: () => number = Math.random): string {
  const index = Math.floor(random() * PREVIEW_TEXT_OVERLAY_ARROW_PATHS.length);
  const arrowPath =
    PREVIEW_TEXT_OVERLAY_ARROW_PATHS[index] ??
    PREVIEW_TEXT_OVERLAY_ARROW_PATHS[0];
  if (!arrowPath) {
    return "";
  }

  const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL?.trim();
  const endpoint = process.env.B2_ENDPOINT?.trim();
  const bucket = process.env.B2_BUCKET_NAME?.trim();
  const baseUrl = publicBaseUrl || endpoint;
  const fileName = arrowPath.split("/").filter(Boolean).at(-1) ?? "";

  if (baseUrl && bucket && fileName) {
    return buildStoragePublicUrl(baseUrl, bucket, `assets/arrows/${fileName}`);
  }

  logger.warn(
    {
      arrowPath,
      hasStoragePublicBaseUrl: Boolean(publicBaseUrl),
      hasB2Endpoint: Boolean(endpoint),
      hasBucketName: Boolean(bucket)
    },
    "Arrow image omitted because no valid storage public URL was available"
  );

  return "";
}

function rankListingImagesForTemplate(
  images: DBListingImage[],
  captionItem: TemplateRenderCaptionItemInput
): string[] {
  const needle =
    `${captionItem.hook ?? ""} ${captionItem.caption ?? ""} ${captionItem.body
      .map((slide) => `${slide.header} ${slide.content}`)
      .join(" ")}`
      .toLowerCase()
      .replace(/[^\w\s]/g, " ");

  const sortByRelevance = (items: DBListingImage[]): DBListingImage[] =>
    [...items].sort((a, b) => {
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

      const aCategoryMatch =
        a.category && needle.includes(a.category.toLowerCase()) ? 1 : 0;
      const bCategoryMatch =
        b.category && needle.includes(b.category.toLowerCase()) ? 1 : 0;
      if (aCategoryMatch !== bCategoryMatch) {
        return bCategoryMatch - aCategoryMatch;
      }

      const aScore =
        typeof a.primaryScore === "number" ? a.primaryScore : -Infinity;
      const bScore =
        typeof b.primaryScore === "number" ? b.primaryScore : -Infinity;
      if (aScore !== bScore) {
        return bScore - aScore;
      }

      return b.uploadedAt.getTime() - a.uploadedAt.getTime();
    });

  const primaryImages = sortByRelevance(
    images.filter((image) => image.isPrimary)
  );
  const secondaryImages = sortByRelevance(
    images.filter((image) => !image.isPrimary)
  );

  return [...primaryImages, ...secondaryImages].reduce<string[]>(
    (urls, image) => {
      const url = image.url.trim();
      if (!url || urls.includes(url)) {
        return urls;
      }

      urls.push(url);
      return urls;
    },
    []
  );
}

function rotateImages(images: string[], startIndex: number): string[] {
  if (images.length === 0) {
    return images;
  }
  const normalized =
    ((startIndex % images.length) + images.length) % images.length;
  return [...images.slice(normalized), ...images.slice(0, normalized)];
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
  return values
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0);
}

export function pickPropertyDetails(
  listing: DBListing
): ListingPropertyDetails | null {
  const details = listing.propertyDetails as ListingPropertyDetails | null;
  return details ?? null;
}

export function resolveTemplateParameters(params: {
  subcategory: ListingContentSubcategory;
  listing: DBListing;
  listingImages: DBListingImage[];
  userAdditional: DBUserAdditional;
  captionItem: TemplateRenderCaptionItemInput;
  random?: () => number;
  now?: Date;
  renderIndex?: number;
  rotationKey?: string;
  imageRotationStore?: TemplateImageRotationStore;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const details = pickPropertyDetails(params.listing);
  const rankedImages = rankListingImagesForTemplate(
    params.listingImages,
    params.captionItem
  );
  const random = params.random ?? Math.random;
  const resolvedRotationIndex = (() => {
    if (
      typeof params.rotationKey === "string" &&
      params.rotationKey.length > 0
    ) {
      if (rankedImages.length === 0) {
        return 0;
      }

      const previous = params.imageRotationStore?.getIndex(params.rotationKey);
      if (typeof previous === "number" && Number.isFinite(previous)) {
        const next = (previous + 1) % rankedImages.length;
        params.imageRotationStore?.setIndex(params.rotationKey, next);
        return next;
      }

      const seeded = Math.floor(random() * rankedImages.length);
      const start = Number.isFinite(seeded)
        ? Math.min(rankedImages.length - 1, Math.max(0, seeded))
        : 0;
      params.imageRotationStore?.setIndex(params.rotationKey, start);
      return start;
    }
    return params.renderIndex ?? 0;
  })();
  const images = rotateImages(rankedImages, resolvedRotationIndex);
  const now = params.now ?? new Date();
  const openHouseContext = resolveListingOpenHouseContext({
    listingPropertyDetails: details,
    listingAddress:
      details?.address?.trim() ||
      params.listing.address?.trim() ||
      params.listing.title?.trim() ||
      "",
    now
  });

  const fallbackHeader = params.captionItem.hook?.trim() || "Just listed";
  const { headerTextTop, headerTextBottom } = splitHeaderText(fallbackHeader);
  const bedCount =
    typeof details?.bedrooms === "number"
      ? formatNumberUs(details.bedrooms)
      : "";
  const bathCount =
    typeof details?.bathrooms === "number"
      ? formatNumberUs(details.bathrooms)
      : "";
  const garageCount = "";
  const squareFootageRaw =
    typeof details?.living_area_sq_ft === "number"
      ? `${formatNumberUs(details.living_area_sq_ft)} sqft`
      : "";
  const beds = bedCount ? `${bedCount} beds` : "";
  const baths = bathCount ? `${bathCount} baths` : "";
  const sqft =
    typeof details?.living_area_sq_ft === "number"
      ? `${formatNumberUs(details.living_area_sq_ft)} sq. ft.`
      : "";

  const listingPrice = formatCurrencyUsd(details?.listing_price ?? null, "$0");
  const priceLabel =
    params.subcategory === "status_update" ? "sold for" : "starting from";
  const featureItems = compactList([
    beds,
    baths,
    squareFootageRaw,
    ...(details?.living_spaces ?? []),
    ...(details?.additional_spaces ?? []),
    details?.architecture ?? null
  ]);

  const agentName = params.userAdditional.agentName?.trim() || "";
  const agentTitle = params.userAdditional.agentTitle?.trim() || "";
  const brokerageName = params.userAdditional.brokerageName?.trim() || "";
  const listingAddress =
    details?.address?.trim() ||
    params.listing.address?.trim() ||
    params.listing.title?.trim() ||
    "";
  const agentContact1 = "";
  const agentContact2 = "";
  const agentContact3 = "";

  return {
    headerText: fallbackHeader,
    headerTag: resolveHeaderTag(params.subcategory),
    headerTextTop,
    headerTextBottom,
    subheader1Text: params.captionItem.body[0]?.header ?? "",
    subheader2Text: params.captionItem.body[1]?.header ?? "",
    arrowImage: pickRandomArrowPath(random),
    bedCount,
    bathCount,
    garageCount,
    squareFootage: squareFootageRaw,
    beds,
    baths,
    sqft,
    listingPrice,
    priceLabel,
    priceDescription: `${priceLabel} ${listingPrice}`,
    propertyDescription: "",
    backgroundImage1: images[0] ?? "",
    backgroundImage2: images[1] ?? "",
    backgroundImage3: images[2] ?? "",
    backgroundImage4: images[3] ?? "",
    backgroundImage5: images[4] ?? "",
    listingAddress,
    feature1: featureItems[0] ?? "",
    feature2: featureItems[1] ?? "",
    feature3: featureItems[2] ?? "",
    featureList: featureItems.join(" • "),
    openHouseDateTime:
      params.subcategory === "open_house" && openHouseContext.hasSchedule
        ? openHouseContext.openHouseDateTimeLabel
        : "",
    socialHandle: "@zencourt_test2",
    agentName,
    agentTitle,
    agentProfileImage: params.userAdditional.headshotUrl?.trim() || "",
    agentContactInfo: "",
    agentContact1,
    agentContact2,
    agentContact3,
    agencyName: brokerageName
  };
}
