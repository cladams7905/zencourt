export type ListingImageItem = {
  id: string;
  url: string;
  filename: string;
  category: string | null;
  isPrimary?: boolean | null;
  primaryScore?: number | null;
};

export interface ListingCategorizeViewProps {
  title: string;
  initialAddress: string;
  listingId: string;
  initialImages: ListingImageItem[];
  googleMapsApiKey: string;
  hasPropertyDetails: boolean;
}
