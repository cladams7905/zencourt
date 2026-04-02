const mockUpdateListingForCurrentUser = jest.fn();
const mockFetchPropertyDetailsForCurrentUser = jest.fn();
const mockCategorizeListingImagesForCurrentUser = jest.fn();
const mockStartListingVideoGeneration = jest.fn();
const mockCancelVideoGenerationBatch = jest.fn();

jest.mock("@web/src/server/actions/listings/commands", () => ({
  updateListingForCurrentUser: (...args: unknown[]) =>
    mockUpdateListingForCurrentUser(...args)
}));

jest.mock("@web/src/server/actions/listings/propertyDetails", () => ({
  fetchPropertyDetailsForCurrentUser: (...args: unknown[]) =>
    mockFetchPropertyDetailsForCurrentUser(...args)
}));

jest.mock("@web/src/server/actions/listings/image/categorize", () => ({
  categorizeListingImagesForCurrentUser: (...args: unknown[]) =>
    mockCategorizeListingImagesForCurrentUser(...args)
}));

jest.mock("@web/src/server/actions/video/generate", () => ({
  startListingVideoGeneration: (...args: unknown[]) =>
    mockStartListingVideoGeneration(...args),
  cancelVideoGenerationBatch: (...args: unknown[]) =>
    mockCancelVideoGenerationBatch(...args)
}));

import {
  cancelVideoGeneration,
  countTerminalInBatch,
  fetchPropertyDetails,
  fetchListingImages,
  fetchVideoStatus,
  startListingContentGeneration,
  startVideoGeneration,
  triggerCategorization,
  updateListingStage
} from "@web/src/components/listings/stage/processing/domain/transport";

describe("processing transport", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("delegates action-backed operations", async () => {
    await updateListingStage("l1", "review");
    await fetchPropertyDetails("l1", undefined);
    await triggerCategorization("l1");
    await startVideoGeneration("l1");
    await cancelVideoGeneration("batch-1");

    expect(mockUpdateListingForCurrentUser).toHaveBeenCalledWith("l1", {
      listingStage: "review"
    });
    expect(mockCategorizeListingImagesForCurrentUser).toHaveBeenCalledWith(
      "l1"
    );
    expect(mockFetchPropertyDetailsForCurrentUser).toHaveBeenCalledWith(
      "l1",
      null
    );
    expect(mockStartListingVideoGeneration).toHaveBeenCalledWith({
      listingId: "l1"
    });
    expect(mockCancelVideoGenerationBatch).toHaveBeenCalledWith(
      "batch-1",
      "Canceled by user"
    );
  });

  it("handles video status and listing image fetch responses", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            batchId: "batch-1",
            status: "processing",
            totalJobs: 1,
            completedJobs: 0,
            failedJobs: 0,
            canceledJobs: 0,
            isTerminal: false,
            allSucceeded: false
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ category: null }] })
      });

    await expect(fetchVideoStatus("batch-1")).resolves.toEqual({
      batchId: "batch-1",
      status: "processing",
      totalJobs: 1,
      completedJobs: 0,
      failedJobs: 0,
      canceledJobs: 0,
      isTerminal: false,
      allSucceeded: false
    });
    await expect(fetchListingImages("l1")).resolves.toEqual([
      { category: null }
    ]);
  });

  it("throws generation error message from payload", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "boom" })
    });

    await expect(startListingContentGeneration("l1")).rejects.toThrow("boom");
  });

  it("returns null or an empty list when api fetches fail", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("status failed"))
      .mockRejectedValueOnce(new Error("images failed"));

    await expect(fetchVideoStatus("batch-1")).resolves.toBeNull();
    await expect(fetchListingImages("l1")).resolves.toEqual([]);
  });

  it("counts terminal and processing images within a batch", () => {
    expect(
      countTerminalInBatch(
        [
          { id: "1", category: null, analysisStatus: "complete" },
          { id: "2", category: null, analysisStatus: "failed" },
          { id: "3", category: null, analysisStatus: "processing" },
          { id: "4", category: null, analysisStatus: "pending" }
        ],
        ["1", "2", "3"]
      )
    ).toEqual({
      batchImages: [
        { id: "1", category: null, analysisStatus: "complete" },
        { id: "2", category: null, analysisStatus: "failed" },
        { id: "3", category: null, analysisStatus: "processing" }
      ],
      batchTotal: 3,
      batchCompleted: 2,
      processingCount: 1,
      isComplete: false
    });
  });
});
