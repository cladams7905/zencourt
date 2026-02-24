import type { SerializableImageData } from "@web/src/lib/domain/listing/images";
import type { CategorizedImages, CategorizationResult } from "../types";

export function cloneSerializableImages(
  images: SerializableImageData[]
): SerializableImageData[] {
  return images.map((image) => ({
    id: image.id,
    listingId: image.listingId,
    url: image.url,
    filename: image.filename,
    category: image.category,
    confidence: image.confidence,
    primaryScore: image.primaryScore ?? null,
    status: image.status,
    isPrimary: image.isPrimary,
    metadata: image.metadata,
    error: image.error,
    uploadUrl: image.uploadUrl
  }));
}

export function categorizeAnalyzedImages(
  images: SerializableImageData[]
): CategorizedImages {
  const categorized: CategorizedImages = {};

  images.forEach((image) => {
    if (image.category) {
      const category = image.category;
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(image);
    } else if (image.status === "error") {
      if (!categorized.errors) {
        categorized.errors = [];
      }
      categorized.errors.push(image);
    } else {
      if (!categorized.other) {
        categorized.other = [];
      }
      categorized.other.push(image);
    }
  });

  return categorized;
}

export function calculateProcessingStats(
  images: SerializableImageData[],
  duration: number
): CategorizationResult["stats"] {
  const uploaded = images.filter((img) => img.url).length;
  const analyzed = images.filter((img) => img.category).length;
  const failed = images.filter((img) => img.status === "error").length;

  const confidences = images
    .filter((img) => img.category)
    .map((img) => img.confidence || 0);

  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0;

  const successRate = images.length > 0 ? (analyzed / images.length) * 100 : 0;

  return {
    total: images.length,
    uploaded,
    analyzed,
    failed,
    successRate,
    avgConfidence,
    totalDuration: duration
  };
}
