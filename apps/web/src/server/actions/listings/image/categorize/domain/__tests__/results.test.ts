import {
  calculateProcessingStats,
  categorizeAnalyzedImages,
  cloneSerializableImages
} from "../results";

describe("image categorize results", () => {
  it("clones serializable images without mutating references", () => {
    const input = [
      { id: "1", listingId: "l1", url: "u", filename: "a.jpg", category: "kitchen" }
    ] as never;

    const cloned = cloneSerializableImages(input);

    expect(cloned[0]).toEqual(
      expect.objectContaining({
        id: "1",
        listingId: "l1",
        url: "u",
        filename: "a.jpg",
        category: "kitchen",
        primaryScore: null
      })
    );
    expect(cloned[0]).not.toBe(input[0]);
  });

  it("groups images by category/errors/other buckets", () => {
    const grouped = categorizeAnalyzedImages([
      { id: "1", category: "kitchen", status: "ready" },
      { id: "2", status: "error" },
      { id: "3", status: "ready" }
    ] as never);

    expect(grouped.kitchen).toHaveLength(1);
    expect(grouped.errors).toHaveLength(1);
    expect(grouped.other).toHaveLength(1);
  });

  it("calculates processing stats including confidence and success rate", () => {
    const stats = calculateProcessingStats(
      [
        { id: "1", url: "u1", category: "kitchen", confidence: 0.9, status: "ready" },
        { id: "2", url: "u2", category: "bathroom", confidence: 0.7, status: "ready" },
        { id: "3", url: null, category: null, status: "error" }
      ] as never,
      1250
    );

    expect(stats).toEqual(
      expect.objectContaining({
        total: 3,
        uploaded: 2,
        analyzed: 2,
        failed: 1,
        successRate: (2 / 3) * 100,
        avgConfidence: 0.8,
        totalDuration: 1250
      })
    );
  });
});
