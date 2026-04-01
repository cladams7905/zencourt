export type ListingImageItem = {
  id: string;
  url: string;
  filename: string;
  category: string | null;
  recommendationScore?: number | null;
  shotType?: string | null;
  analysisStatus?: string | null;
  metadata?: {
    featureTags?: string[];
    detailType?: string;
    scoreBreakdown?: {
      total: number;
      technical: number;
      composition: number;
      storytelling: number;
    };
  } | null;
};

export interface ListingCategorizeViewProps {
  title: string;
  initialAddress: string;
  listingId: string;
  initialImages: ListingImageItem[];
  googleMapsApiKey: string;
  hasPropertyDetails: boolean;
}
