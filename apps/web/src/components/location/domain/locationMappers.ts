import { normalizeCountyName } from "@web/src/lib/locationHelpers";
import type { LocationData } from "@web/src/components/location/shared/types";

export type ParsedAddressFields = Pick<
  LocationData,
  "city" | "state" | "country" | "postalCode" | "county"
>;

export const parseAddressComponents = (
  components: google.maps.GeocoderAddressComponent[]
): ParsedAddressFields => {
  let city = "";
  let state = "";
  let country = "";
  let postalCode = "";
  let county = "";

  for (const component of components) {
    if (component.types.includes("locality")) {
      city = component.long_name;
    } else if (component.types.includes("administrative_area_level_1")) {
      state = component.short_name;
    } else if (component.types.includes("administrative_area_level_2")) {
      county = normalizeCountyName(component.long_name);
    } else if (component.types.includes("country")) {
      country = component.long_name;
    } else if (component.types.includes("postal_code")) {
      postalCode = component.long_name;
    }
  }

  return { city, state, country, postalCode, county };
};

export const formatLocationDisplay = (location: LocationData): string => {
  if (location.country === "United States") {
    const cityState = [location.city, location.state].filter(Boolean).join(", ");
    return [cityState, location.postalCode].filter(Boolean).join(" ");
  }

  return `${location.city}, ${location.country}`;
};

export const extractZipFromZips = (zips: string): string => {
  const match = zips.match(/\b\d{5}\b/);
  return match ? match[0] : "";
};

export const isPostalCodeInput = (value: string): boolean => {
  return /^\d{5}(-\d{4})?$/.test(value.replace(/\s+/g, ""));
};
