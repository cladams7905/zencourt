const mockSelectWhere = jest.fn();
const mockUpdateWhere = jest.fn();
const mockGetListingById = jest.fn();
const mockAssignPrimary = jest.fn();
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
  inArray: (...args: unknown[]) => ({ type: "inArray", args })
}));

jest.mock("@web/src/server/models/listings", () => ({
  getListingById: (...args: unknown[]) => mockGetListingById(...args)
}));

jest.mock("@web/src/server/models/listingImages", () => ({
  assignPrimaryListingImageForCategoryTrusted: (...args: unknown[]) =>
    mockAssignPrimary(...args)
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
      { id: "img-1", listingId: "listing-1", category: "kitchen" },
      { id: "img-2", listingId: "listing-1", category: "bathroom" }
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
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: "img-1",
        listingId: "listing-1",
        filename: "a.jpg",
        url: "https://img-1",
        category: null,
        confidence: null,
        primaryScore: null,
        isPrimary: false,
        metadata: null
      },
      {
        id: "img-2",
        listingId: "listing-1",
        filename: "b.jpg",
        url: "https://img-2",
        category: null,
        confidence: null,
        primaryScore: null,
        isPrimary: false,
        metadata: null
      }
    ]);
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
                primaryScore?: number;
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
            primaryScore: 0.8,
            perspective: "ground"
          },
          error: null
        });
        opts.onProgress(2, 2, {
          imageUrl: "https://img-2",
          success: true,
          classification: {
            category: "other",
            confidence: 0.4
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
    expect(mockAssignPrimary).toHaveBeenCalledWith("listing-1", "kitchen");
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
