const mockSelectWhere = jest.fn();
const mockUpdateWhere = jest.fn();
const mockGetListingById = jest.fn();
const mockClassifyRoomBatch = jest.fn();
const mockGetPublicUrlForStorageUrl = jest.fn((url: string) => url);
const mockLoggerError = jest.fn();

jest.mock("@db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => mockSelectWhere(...args)
      })
    }),
    update: () => ({
      set: () => ({
        where: (...args: unknown[]) => mockUpdateWhere(...args)
      })
    })
  },
  listingImages: {
    id: "id",
    listingId: "listingId"
  },
  and: (...args: unknown[]) => ({ type: "and", args }),
  eq: (...args: unknown[]) => ({ type: "eq", args }),
  inArray: (...args: unknown[]) => ({ type: "inArray", args }),
  lt: (...args: unknown[]) => ({ type: "lt", args }),
  or: (...args: unknown[]) => ({ type: "or", args })
}));

jest.mock("@web/src/server/models/listings", () => ({
  getListingById: (...args: unknown[]) => mockGetListingById(...args)
}));

jest.mock("@web/src/server/services/roomClassification", () => ({
  __esModule: true,
  default: {
    classifyRoomBatch: (...args: unknown[]) => mockClassifyRoomBatch(...args)
  }
}));

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    getPublicUrlForStorageUrl: (url: string) =>
      mockGetPublicUrlForStorageUrl(url)
  }
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args)
  })
}));

describe("categorize helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPublicUrlForStorageUrl.mockImplementation((url: string) => url);
  });

  it("maps db row to serializable image data", async () => {
    const { toSerializableImageData } = await import("../helpers");
    const result = toSerializableImageData({
      id: "img-1",
      listingId: "listing-1",
      url: "https://img",
      filename: "a.jpg",
      category: null,
      confidence: null,
      primaryScore: null,
      isPrimary: false,
      metadata: null
    } as never);
    expect(result).toEqual(
      expect.objectContaining({
        id: "img-1",
        listingId: "listing-1",
        status: "uploaded"
      })
    );
  });

  it("loads listing images with or without imageIds", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([{ id: "1" }])
      .mockResolvedValueOnce([{ id: "2" }]);
    const { loadListingImagesForWorkflow } = await import("../helpers");

    await expect(loadListingImagesForWorkflow("listing-1")).resolves.toEqual([
      { id: "1" }
    ]);
    await expect(
      loadListingImagesForWorkflow("listing-1", ["img-1"])
    ).resolves.toEqual([{ id: "2" }]);
  });

  it("persists image analysis values", async () => {
    const { persistListingImageAnalysis } = await import("../helpers");
    await persistListingImageAnalysis("listing-1", {
      id: "img-1",
      listingId: "listing-1",
      url: "https://img",
      filename: "a.jpg",
      category: "kitchen",
      confidence: 0.8,
      primaryScore: 0.7,
      status: "analyzed",
      isPrimary: false,
      metadata: null
    } as never);
    expect(mockUpdateWhere).toHaveBeenCalled();
  });

  it("throws when listing is not found", async () => {
    mockGetListingById.mockResolvedValueOnce(null);
    const { runListingImagesCategorizationWorkflow } = await import("../helpers");

    await expect(
      runListingImagesCategorizationWorkflow("user-1", "listing-1")
    ).rejects.toThrow("Listing not found");
  });

  it("returns noop stats when every image already has a category", async () => {
    mockGetListingById.mockResolvedValueOnce({ id: "listing-1" });
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: "img-1",
        listingId: "listing-1",
        category: "kitchen",
        analysisStatus: "complete"
      },
      {
        id: "img-2",
        listingId: "listing-1",
        category: "bathroom",
        analysisStatus: "complete"
      }
    ]);
    const { runListingImagesCategorizationWorkflow } = await import("../helpers");

    await expect(
      runListingImagesCategorizationWorkflow("user-1", "listing-1")
    ).resolves.toEqual({
      total: 0,
      uploaded: 2,
      analyzed: 2,
      failed: 0,
      successRate: 100,
      avgConfidence: 0,
      totalDuration: 0
    });
  });

  it("analyzes images and assigns primary categories", async () => {
    mockGetListingById.mockResolvedValueOnce({ id: "listing-1" });
    const pendingRows = [
      {
        id: "img-1",
        listingId: "listing-1",
        filename: "a.jpg",
        url: "https://img-1",
        category: null,
        confidence: null,
        recommendationScore: null,
        isPrimary: false,
        metadata: null,
        analysisStatus: "pending",
        analysisRunId: null,
        analysisStartedAt: null,
        analysisCompletedAt: null
      },
      {
        id: "img-2",
        listingId: "listing-1",
        filename: "b.jpg",
        url: "https://img-2",
        category: null,
        confidence: null,
        recommendationScore: null,
        isPrimary: false,
        metadata: null,
        analysisStatus: "pending",
        analysisRunId: null,
        analysisStartedAt: null,
        analysisCompletedAt: null
      }
    ];
    mockSelectWhere
      .mockResolvedValueOnce(pendingRows)
      .mockResolvedValueOnce(pendingRows);

    const sampleScores = {
      lighting: 0.9,
      framing: 0.88,
      coverage: 0.9,
      clarity: 0.9,
      motionPotential: 0.8,
      roomRepresentativeness: 0.94
    };

    mockClassifyRoomBatch.mockImplementation(
      async (
        _urls: string[],
        opts: {
          onProgress: (
            completed: number,
            total: number,
            result: {
              imageUrl: string;
              success: boolean;
              classification: {
                category: string;
                confidence: number;
                shotType: "room" | "detail" | "other";
                featureTags: string[];
                scores: typeof sampleScores;
                perspective?: "aerial" | "ground";
              } | null;
              error: string | null;
            }
          ) => void;
        }
      ) => {
        opts.onProgress(1, 2, {
          imageUrl: "https://img-1",
          success: true,
          classification: {
            category: "kitchen",
            confidence: 0.9,
            shotType: "room",
            featureTags: ["island"],
            scores: sampleScores,
            perspective: "ground"
          },
          error: null
        });
        opts.onProgress(2, 2, {
          imageUrl: "https://img-2",
          success: true,
          classification: {
            category: "other",
            confidence: 0.4,
            shotType: "other",
            featureTags: [],
            scores: {
              lighting: 0.5,
              framing: 0.5,
              coverage: 0.5,
              clarity: 0.5,
              motionPotential: 0.3,
              roomRepresentativeness: 0.2
            }
          },
          error: null
        });
      }
    );

    const { runListingImagesCategorizationWorkflow } = await import("../helpers");
    const result = await runListingImagesCategorizationWorkflow(
      "user-1",
      "listing-1",
      { aiConcurrency: 3 }
    );

    expect(result.total).toBe(2);
    expect(mockClassifyRoomBatch).toHaveBeenCalledWith(
      ["https://img-1", "https://img-2"],
      expect.objectContaining({ concurrency: 3, onProgress: expect.any(Function) })
    );
    expect(mockUpdateWhere).toHaveBeenCalled();
  });

  it("errors when no uploaded images are eligible for analysis", async () => {
    const { runAnalyzeImagesWorkflow } = await import("../helpers");
    await expect(
      runAnalyzeImagesWorkflow([
        {
          id: "img-1",
          listingId: "listing-1",
          filename: "a.jpg",
          url: null,
          category: null,
          confidence: null,
          primaryScore: null,
          status: "error",
          isPrimary: false,
          metadata: null
        } as never
      ])
    ).rejects.toThrow("No images successfully uploaded for analysis");
  });

  it("throws when uploaded images do not resolve to accessible urls", async () => {
    mockGetPublicUrlForStorageUrl.mockReturnValue("");
    const { runAnalyzeImagesWorkflow } = await import("../helpers");

    await expect(
      runAnalyzeImagesWorkflow([
        {
          id: "img-1",
          listingId: "listing-1",
          filename: "a.jpg",
          url: "https://private",
          category: null,
          confidence: null,
          primaryScore: null,
          status: "uploaded",
          isPrimary: false,
          metadata: null
        } as never
      ])
    ).rejects.toThrow(
      "No accessible images available for analysis"
    );
    expect(mockClassifyRoomBatch).not.toHaveBeenCalled();
  });
});
