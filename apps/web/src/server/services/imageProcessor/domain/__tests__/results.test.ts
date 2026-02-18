import {
  calculateProcessingStats,
  categorizeAnalyzedImages,
  cloneSerializableImages
} from "../results";
import type { SerializableImageData } from "@web/src/lib/domain/listing/images";

function buildImage(partial: Partial<SerializableImageData>): SerializableImageData {
  return {
    id: partial.id ?? "img-1",
    listingId: partial.listingId ?? "listing-1",
    filename: partial.filename ?? "image.jpg",
    url: partial.url,
    category: partial.category,
    confidence: partial.confidence,
    primaryScore: partial.primaryScore,
    status: partial.status ?? "uploaded",
    isPrimary: partial.isPrimary ?? false,
    metadata: partial.metadata,
    error: partial.error,
    uploadUrl: partial.uploadUrl
  };
}

describe("imageProcessor/domain/results", () => {
  it("clones serializable images and defaults primaryScore to null", () => {
    const images = [buildImage({ id: "a", primaryScore: undefined })];

    const cloned = cloneSerializableImages(images);

    expect(cloned).toEqual([
      expect.objectContaining({
        id: "a",
        primaryScore: null
      })
    ]);
    expect(cloned).not.toBe(images);
    expect(cloned[0]).not.toBe(images[0]);
  });

  it("categorizes images by category/errors/other", () => {
    const images: SerializableImageData[] = [
      buildImage({ id: "c1", category: "kitchen", status: "analyzed" }),
      buildImage({ id: "e1", status: "error", error: "failed" }),
      buildImage({ id: "o1", status: "uploaded" })
    ];

    const categorized = categorizeAnalyzedImages(images);

    expect(categorized.kitchen).toHaveLength(1);
    expect(categorized.errors).toHaveLength(1);
    expect(categorized.other).toHaveLength(1);
  });

  it("calculates processing stats", () => {
    const images: SerializableImageData[] = [
      buildImage({
        id: "1",
        url: "https://cdn.example.com/1.jpg",
        category: "kitchen",
        confidence: 0.8,
        status: "analyzed"
      }),
      buildImage({
        id: "2",
        url: "https://cdn.example.com/2.jpg",
        category: "bedroom",
        confidence: 0.6,
        status: "analyzed"
      }),
      buildImage({
        id: "3",
        status: "error",
        error: "invalid response"
      })
    ];

    expect(calculateProcessingStats(images, 1500)).toEqual({
      total: 3,
      uploaded: 2,
      analyzed: 2,
      failed: 1,
      successRate: (2 / 3) * 100,
      avgConfidence: 0.7,
      totalDuration: 1500
    });
  });
});
