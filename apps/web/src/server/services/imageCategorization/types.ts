import type { SerializableImageData } from "@web/src/lib/domain/listing/images";

export interface CategorizedImages {
  [category: string]: SerializableImageData[];
}

export interface CategorizationResult {
  images: SerializableImageData[];
  stats: {
    total: number;
    uploaded: number;
    analyzed: number;
    failed: number;
    successRate: number;
    avgConfidence: number;
    totalDuration: number;
  };
  categorized: CategorizedImages;
}
