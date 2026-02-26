import type { ListingPropertyDetails } from "@shared/types/models";
import type { TemplateRenderParameterKey } from "@web/src/lib/domain/media/templateRender/types";
import { formatNumberUs } from "@web/src/lib/core/formatting/number";

function compactList(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim() ?? "").filter((value) => value.length > 0);
}

export function applyFeaturePolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  details: ListingPropertyDetails | null;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const next = { ...params.resolvedParameters };
  const details = params.details;

  const bedCount =
    typeof details?.bedrooms === "number" ? `${formatNumberUs(details.bedrooms)} beds` : "";
  const bathCount =
    typeof details?.bathrooms === "number"
      ? `${formatNumberUs(details.bathrooms)} baths`
      : "";
  const garageCount = "";
  const squareFootage =
    typeof details?.living_area_sq_ft === "number"
      ? `${formatNumberUs(details.living_area_sq_ft)} sqft`
      : "";

  const featureList = compactList([
    bedCount,
    bathCount,
    garageCount ? `${garageCount}-car garage` : "",
    typeof details?.living_area_sq_ft === "number"
      ? `${formatNumberUs(details.living_area_sq_ft)} sq. ft.`
      : ""
  ]).join(", ");

  next.bedCount = bedCount;
  next.bathCount = bathCount;
  next.garageCount = garageCount;
  next.squareFootage = squareFootage;
  next.feature1 = bedCount;
  next.feature2 = bathCount;
  next.feature3 = squareFootage;
  next.featureList = featureList;

  return next;
}
