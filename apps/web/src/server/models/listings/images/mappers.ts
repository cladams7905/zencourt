import type { DBListingImage } from "@db/types/models";

export type ListingImageDisplayItem = {
  id: string;
  url: string;
  filename: string;
  category: string | null;
  recommendationScore: number | null;
  shotType: string;
  analysisStatus: string;
  metadata: DBListingImage["metadata"];
  uploadedAtMs: number;
};

export function mapListingImageToDisplayItem(
  image: DBListingImage
): ListingImageDisplayItem {
  return {
    id: image.id,
    url: image.url,
    filename: image.filename,
    category: image.category ?? null,
    recommendationScore:
      typeof image.recommendationScore === "number"
        ? image.recommendationScore
        : null,
    shotType: image.shotType,
    analysisStatus: image.analysisStatus,
    metadata: image.metadata ?? null,
    uploadedAtMs: image.uploadedAt.getTime()
  };
}
