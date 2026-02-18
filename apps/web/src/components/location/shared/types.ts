export type { LocationData } from "@web/src/lib/domain/location/types";

export interface AddressSelection {
  formattedAddress: string;
  placeId: string;
  addressComponents?: google.maps.GeocoderAddressComponent[];
}

export interface GeoFallbackResult {
  county: string;
  serviceAreas: string[];
}
