export interface LocationData {
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  county?: string;
  serviceAreas?: string[];
  placeId: string;
  formattedAddress: string;
}

export interface AddressSelection {
  formattedAddress: string;
  placeId: string;
  addressComponents?: google.maps.GeocoderAddressComponent[];
}

export interface GeoFallbackResult {
  county: string;
  serviceAreas: string[];
}
