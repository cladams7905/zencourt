export type WorkspacePlacement = "used" | "dock";

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
  workspacePlacement?: WorkspacePlacement;
  isOther?: boolean;
  isUncategorized?: boolean;
  isDetail?: boolean;
};

export interface ListingCategorizeViewProps {
  title: string;
  initialAddress: string;
  listingId: string;
  initialImages: ListingImageItem[];
  hasPropertyDetails: boolean;
}
