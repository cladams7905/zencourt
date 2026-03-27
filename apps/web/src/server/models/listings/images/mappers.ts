import type { DBListingImage } from "@db/types/models";

export type ListingImageDisplayItem = {
  id: string;
  url: string;
  filename: string;
  category: string | null;
  isPrimary: boolean;
  primaryScore: number | null;
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
    isPrimary: Boolean(image.isPrimary),
    primaryScore: typeof image.primaryScore === "number" ? image.primaryScore : null,
    uploadedAtMs: image.uploadedAt.getTime()
  };
}
