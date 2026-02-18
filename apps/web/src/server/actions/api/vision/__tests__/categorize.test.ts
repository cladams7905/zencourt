const mockAnalyzeImagesWorkflow = jest.fn();
const mockAssertListingExists = jest.fn();
const mockLoadListingImages = jest.fn();
const mockPersistListingImageAnalysis = jest.fn();
const mockAssignPrimaryImagesByCategory = jest.fn();

jest.mock("@web/src/server/services/imageProcessor", () => ({
  __esModule: true,
  default: {
    analyzeImagesWorkflow: (...args: unknown[]) => mockAnalyzeImagesWorkflow(...args)
  }
}));

jest.mock("@web/src/server/actions/api/vision/helpers", () => ({
  assertListingExists: (...args: unknown[]) => mockAssertListingExists(...args),
  loadListingImages: (...args: unknown[]) => mockLoadListingImages(...args),
  persistListingImageAnalysis: (...args: unknown[]) => mockPersistListingImageAnalysis(...args),
  assignPrimaryImagesByCategory: (...args: unknown[]) =>
    mockAssignPrimaryImagesByCategory(...args),
  toSerializableImageData: (image: unknown) => image
}));

import {
  categorizeListingImages,
  categorizeListingImagesByIds
} from "@web/src/server/actions/api/vision/categorize";

describe("vision categorize action", () => {
  beforeEach(() => {
    mockAnalyzeImagesWorkflow.mockReset();
    mockAssertListingExists.mockReset();
    mockLoadListingImages.mockReset();
    mockPersistListingImageAnalysis.mockReset();
    mockAssignPrimaryImagesByCategory.mockReset();
  });

  it("validates required params", async () => {
    await expect(categorizeListingImages("", "l1")).rejects.toThrow(
      "User ID is required to categorize listing images"
    );
    await expect(categorizeListingImages("u1", "")).rejects.toThrow(
      "Listing ID is required to categorize listing images"
    );
  });

  it("returns noop stats when no images need analysis", async () => {
    mockLoadListingImages.mockResolvedValueOnce([{ id: "img-1", category: "kitchen" }]);

    const result = await categorizeListingImages("u1", "l1");

    expect(result).toEqual({
      total: 0,
      uploaded: 1,
      analyzed: 1,
      failed: 0,
      successRate: 100,
      avgConfidence: 0,
      totalDuration: 0
    });
    expect(mockAnalyzeImagesWorkflow).not.toHaveBeenCalled();
  });

  it("returns noop stats for empty imageIds input", async () => {
    await expect(categorizeListingImagesByIds("u1", "l1", [])).resolves.toEqual({
      total: 0,
      uploaded: 0,
      analyzed: 0,
      failed: 0,
      successRate: 100,
      avgConfidence: 0,
      totalDuration: 0
    });
  });

  it("analyzes, persists, and assigns categories", async () => {
    mockLoadListingImages.mockResolvedValueOnce([
      { id: "img-1", category: null },
      { id: "img-2", category: null }
    ]);

    mockAnalyzeImagesWorkflow.mockImplementationOnce(
      async (
        _images: unknown[],
        options: { onProgress?: (progress: { currentImage?: unknown }) => void }
      ) => {
        options.onProgress?.({ currentImage: { id: "img-1", category: "kitchen" } });
        return {
          images: [
            { id: "img-1", category: "kitchen" },
            { id: "img-2", category: "bathroom" }
          ],
          stats: {
            total: 2,
            uploaded: 2,
            analyzed: 2,
            failed: 0,
            successRate: 100,
            avgConfidence: 0.8,
            totalDuration: 10
          }
        };
      }
    );

    const result = await categorizeListingImages("u1", "l1", { aiConcurrency: 2 });

    expect(result).toEqual(
      expect.objectContaining({ total: 2, analyzed: 2, failed: 0 })
    );
    expect(mockPersistListingImageAnalysis).toHaveBeenCalled();
    expect(mockAssignPrimaryImagesByCategory).toHaveBeenCalledWith(
      "u1",
      "l1",
      ["kitchen", "bathroom"]
    );
  });
});
