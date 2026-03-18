import type { ListingPropertyDetails } from "@shared/types/models";
import type { TemplateRenderParameterKey } from "@web/src/lib/domain/media/templateRender/types";
import { formatNumberUs } from "@web/src/lib/core/formatting/number";

function parseAddressParts(address: string): { street: string; city: string } {
  const normalized = address.trim();
  if (!normalized) {
    return { street: "", city: "" };
  }
  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    street: parts[0] ?? "",
    city: parts.length >= 2 ? (parts[1] ?? "") : ""
  };
}

function compactList(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim() ?? "").filter(Boolean);
}

export function applyPropertyDescriptionPolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  details: ListingPropertyDetails | null;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const next = { ...params.resolvedParameters };
  const details = params.details;
  const listingAddress = next.listingAddress?.trim() ?? "";
  const { street, city } = parseAddressParts(listingAddress);

  const featureParts = compactList([
    typeof details?.bedrooms === "number"
      ? `${formatNumberUs(details.bedrooms)}-bed`
      : "",
    typeof details?.bathrooms === "number"
      ? `${formatNumberUs(details.bathrooms)}-bath`
      : "",
    details?.architecture ?? ""
  ]);

  const subject =
    featureParts.length > 0
      ? `this ${featureParts.join(", ")} home`
      : "this beautiful home";
  const locationPart = street && city
    ? ` located at ${street} in ${city}`
    : city
      ? ` in ${city}`
      : street
        ? ` located at ${street}`
        : "";

  next.propertyDescription = `Come see ${subject}${locationPart}.`;

  return next;
}
