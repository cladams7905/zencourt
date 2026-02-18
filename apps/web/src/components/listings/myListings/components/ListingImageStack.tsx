import { Badge } from "@web/src/components/ui/badge";
import { LoadingImage } from "@web/src/components/ui/loading-image";

type ListingImageStackProps = {
  listingId: string;
  previewImages: string[];
  remainingCount: number;
  imageCount: number;
  maxListingImages: number;
};

export const ListingImageStack = ({
  listingId,
  previewImages,
  remainingCount,
  imageCount,
  maxListingImages
}: ListingImageStackProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {previewImages.map((src, index) => (
          <div
            key={`${listingId}-preview-${index}`}
            className={
              index === 0
                ? "rounded-lg"
                : "-ml-1 rounded-lg border border-background transition-colors group-hover:border-secondary"
            }
          >
            <LoadingImage
              src={src}
              alt="Listing preview"
              width={64}
              height={64}
              className="h-16 w-16 rounded-lg object-cover ring-4 ring-background transition-colors group-hover:ring-secondary"
              unoptimized
            />
          </div>
        ))}
      </div>
      {remainingCount > 0 ? (
        <Badge variant="secondary" className="text-xs">
          +{remainingCount}
        </Badge>
      ) : null}
      <Badge variant="secondary" className="text-xs">
        {imageCount}/{maxListingImages}
      </Badge>
    </div>
  );
};
