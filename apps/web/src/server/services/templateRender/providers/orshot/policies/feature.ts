import type { ListingPropertyDetails } from "@shared/types/models";
import type { TemplateRenderParameterKey } from "@web/src/lib/domain/media/templateRender/types";
import { formatNumberUs } from "@web/src/lib/core/formatting/number";

const FEATURE_LIST_DELIMITERS = [", ", " | ", " • ", " ♦ "] as const;

function compactList(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim() ?? "").filter((value) => value.length > 0);
}

function pickFeatureListDelimiter(random?: () => number): string {
  const pick = random ?? Math.random;
  const index = Math.floor(pick() * FEATURE_LIST_DELIMITERS.length);
  return FEATURE_LIST_DELIMITERS[index] ?? FEATURE_LIST_DELIMITERS[0];
}

export function applyFeaturePolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  details: ListingPropertyDetails | null;
  random?: () => number;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const next = { ...params.resolvedParameters };
  const details = params.details;

  const bedCount =
    typeof details?.bedrooms === "number" ? formatNumberUs(details.bedrooms) : "";
  const bathCount =
    typeof details?.bathrooms === "number"
      ? formatNumberUs(details.bathrooms)
      : "";
  const garageCount = "";
  const squareFootage =
    typeof details?.living_area_sq_ft === "number"
      ? `${formatNumberUs(details.living_area_sq_ft)} sqft`
      : "";

  const featureItems = compactList([
    bedCount ? `${bedCount} beds` : "",
    bathCount ? `${bathCount} baths` : "",
    garageCount ? `${garageCount}-car garage` : "",
    typeof details?.living_area_sq_ft === "number"
      ? `${formatNumberUs(details.living_area_sq_ft)} sq. ft.`
      : ""
  ]);
  const featureList = featureItems.join(pickFeatureListDelimiter(params.random));

  next.bedCount = bedCount;
  next.bathCount = bathCount;
  next.garageCount = garageCount;
  next.squareFootage = squareFootage;
  next.feature1 = bedCount ? `${bedCount} beds` : "";
  next.feature2 = bathCount ? `${bathCount} baths` : "";
  next.feature3 = squareFootage;
  next.featureList = featureList;

  return next;
}
