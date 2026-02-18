import type { LocationData } from "./types";

export const formatLocationForStorage = (location: LocationData): string => {
  if (location.country === "United States") {
    const stateAndZip = [location.state, location.postalCode]
      .filter(Boolean)
      .join(" ");
    return [location.city, stateAndZip].filter(Boolean).join(", ");
  }

  return [location.city, location.country].filter(Boolean).join(", ");
};
