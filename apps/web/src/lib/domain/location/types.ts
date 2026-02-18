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
