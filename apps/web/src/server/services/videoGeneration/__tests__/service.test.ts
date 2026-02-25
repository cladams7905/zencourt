const mockNanoid = jest.fn();
const mockCreateVideoGenBatch = jest.fn();
const mockCreateVideoGenJobsBatch = jest.fn();
const mockGroupImagesByCategory = jest.fn();
const mockSelectListingPrimaryImage = jest.fn();
const mockBuildRoomsFromImages = jest.fn();
const mockGetCategoryForRoom = jest.fn();
const mockSelectPrimaryImageForRoom = jest.fn();
const mockSelectSecondaryImageForRoom = jest.fn();
const mockBuildPrompt = jest.fn();
const mockGetVideoGenerationConfig = jest.fn();
const mockIsPriorityCategory = jest.fn();
const mockFetch = jest.fn();
const mockSelect = jest.fn();

jest.mock("nanoid", () => ({
  nanoid: (...args: unknown[]) => mockNanoid(...args)
}));

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) =>
      (mockSelect as (...a: unknown[]) => unknown)(...args)
  },
  listingImages: {
    listingId: "listingId",
    uploadedAt: "uploadedAt"
  },
  eq: (...args: unknown[]) => args,
  asc: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/models/videoGenBatch", () => ({
  createVideoGenBatch: (...args: unknown[]) => mockCreateVideoGenBatch(...args)
}));

jest.mock("@web/src/server/models/videoGenJobs", () => ({
  createVideoGenJobsBatch: (...args: unknown[]) =>
    mockCreateVideoGenJobsBatch(...args)
}));

jest.mock("../domain/rooms", () => ({
  groupImagesByCategory: (...args: unknown[]) =>
    mockGroupImagesByCategory(...args),
  selectListingPrimaryImage: (...args: unknown[]) =>
    mockSelectListingPrimaryImage(...args),
  buildRoomsFromImages: (...args: unknown[]) =>
    mockBuildRoomsFromImages(...args),
  getCategoryForRoom: (...args: unknown[]) => mockGetCategoryForRoom(...args),
  selectPrimaryImageForRoom: (...args: unknown[]) =>
    mockSelectPrimaryImageForRoom(...args),
  selectSecondaryImageForRoom: (...args: unknown[]) =>
    mockSelectSecondaryImageForRoom(...args)
}));

jest.mock("../domain/prompt", () => ({
  buildPrompt: (...args: unknown[]) => mockBuildPrompt(...args)
}));

jest.mock("../config", () => ({
  getVideoGenerationConfig: (...args: unknown[]) =>
    mockGetVideoGenerationConfig(...args)
}));

jest.mock("@shared/types/video", () => ({
  isPriorityCategory: (...args: unknown[]) => mockIsPriorityCategory(...args)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  createChildLogger: () => ({ info: jest.fn(), error: jest.fn() })
}));

jest.mock("@web/src/app/api/v1/_utils", () => {
  class MockApiError extends Error {
    status: number;
    body: { error: string; message: string };
    constructor(status: number, body: { error: string; message: string }) {
      super(body.message);
      this.status = status;
      this.body = body;
    }
  }

  return {
    ApiError: MockApiError
  };
});

import { startListingVideoGeneration } from "../service";

function makeSelectBuilder(rows: unknown[]) {
  const builder = {
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn()
  } as Record<string, jest.Mock>;

  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockResolvedValue(rows);
  return builder;
}

describe("videoGeneration/service", () => {
  const resolvePublicDownloadUrls = (urls: string[]) =>
    urls.map((url) => `https://signed/${url.split("/").pop()}`);

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockGetVideoGenerationConfig.mockReturnValue({
      model: "veo3.1_fast",
      defaultOrientation: "vertical",
      enablePrioritySecondary: true,
      videoServerBaseUrl: "http://video-server",
      videoServerApiKey: "secret",
      appUrl: "https://example.vercel.app"
    });
  });

  it("creates jobs in batch and enqueues video server request", async () => {
    mockSelect.mockReturnValue(
      makeSelectBuilder([{ id: "img-1", url: "raw-1" }])
    );
    mockNanoid.mockReturnValueOnce("video-1").mockReturnValueOnce("job-1");
    mockGroupImagesByCategory.mockReturnValue(
      new Map([["kitchen", [{ id: "img-1" }]]])
    );
    mockSelectListingPrimaryImage.mockReturnValue({
      url: "https://img/primary.jpg"
    });
    mockBuildRoomsFromImages.mockReturnValue([
      {
        id: "kitchen",
        name: "Kitchen",
        category: "kitchen",
        roomNumber: undefined
      }
    ]);
    mockGetCategoryForRoom.mockReturnValue("kitchen");
    mockSelectPrimaryImageForRoom.mockReturnValue(
      "https://img/kitchen-primary.jpg"
    );
    mockBuildPrompt.mockReturnValue({
      prompt: "Forward pan through the Kitchen.",
      templateKey: "interior-forward-pan"
    });
    mockIsPriorityCategory.mockReturnValue(false);
    mockCreateVideoGenBatch.mockResolvedValue(undefined);
    mockCreateVideoGenJobsBatch.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ ok: true });

    const result = await startListingVideoGeneration({
      listingId: "listing-1",
      userId: "user-1",
      resolvePublicDownloadUrls
    });

    expect(mockCreateVideoGenBatch).toHaveBeenCalledWith(
      expect.objectContaining({ id: "video-1", listingId: "listing-1" })
    );
    expect(mockCreateVideoGenJobsBatch).toHaveBeenCalledTimes(1);
    expect(mockCreateVideoGenJobsBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "job-1",
        videoGenBatchId: "video-1",
        generationSettings: expect.objectContaining({
          model: "veo3.1_fast",
          orientation: "vertical",
          category: "kitchen",
          clipIndex: 0
        })
      })
    ]);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://video-server/video/generate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-API-Key": "secret" })
      })
    );
    expect(result).toEqual({
      videoId: "video-1",
      jobIds: ["job-1"],
      jobCount: 1
    });
  });

  it("throws ApiError when video server enqueue fails", async () => {
    mockSelect.mockReturnValue(
      makeSelectBuilder([{ id: "img-1", url: "raw-1" }])
    );
    mockNanoid.mockReturnValueOnce("video-1").mockReturnValueOnce("job-1");
    mockGroupImagesByCategory.mockReturnValue(
      new Map([["kitchen", [{ id: "img-1" }]]])
    );
    mockSelectListingPrimaryImage.mockReturnValue({
      url: "https://img/primary.jpg"
    });
    mockBuildRoomsFromImages.mockReturnValue([
      { id: "kitchen", name: "Kitchen", category: "kitchen" }
    ]);
    mockGetCategoryForRoom.mockReturnValue("kitchen");
    mockSelectPrimaryImageForRoom.mockReturnValue(
      "https://img/kitchen-primary.jpg"
    );
    mockBuildPrompt.mockReturnValue({
      prompt: "Forward pan through the Kitchen.",
      templateKey: "interior-forward-pan"
    });
    mockIsPriorityCategory.mockReturnValue(false);
    mockCreateVideoGenBatch.mockResolvedValue(undefined);
    mockCreateVideoGenJobsBatch.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ message: "upstream down" })
    });

    await expect(
      startListingVideoGeneration({
        listingId: "listing-1",
        userId: "user-1",
        resolvePublicDownloadUrls
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 502,
        body: {
          error: "Video server error",
          message: "upstream down"
        }
      })
    );
  });

  it("throws when listing has no images", async () => {
    mockSelect.mockReturnValue(makeSelectBuilder([]));

    await expect(
      startListingVideoGeneration({
        listingId: "listing-1",
        userId: "user-1",
        resolvePublicDownloadUrls
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 400
      })
    );
  });

  it("throws when app URL cannot be determined", async () => {
    mockGetVideoGenerationConfig.mockImplementation(() => {
      throw new Error(
        "APP_URL must be configured when not on Vercel (e.g. http://localhost:3000 or http://host.docker.internal:3000)"
      );
    });
    mockSelect.mockReturnValue(
      makeSelectBuilder([{ id: "img-1", url: "raw-1" }])
    );
    mockNanoid.mockReturnValueOnce("video-1").mockReturnValueOnce("job-1");
    mockGroupImagesByCategory.mockReturnValue(
      new Map([["kitchen", [{ id: "img-1" }]]])
    );
    mockSelectListingPrimaryImage.mockReturnValue({
      url: "https://img/primary.jpg"
    });
    mockBuildRoomsFromImages.mockReturnValue([
      { id: "kitchen", name: "Kitchen", category: "kitchen" }
    ]);
    mockGetCategoryForRoom.mockReturnValue("kitchen");
    mockSelectPrimaryImageForRoom.mockReturnValue(
      "https://img/kitchen-primary.jpg"
    );
    mockBuildPrompt.mockReturnValue({
      prompt: "Forward pan through the Kitchen.",
      templateKey: "interior-forward-pan"
    });
    mockIsPriorityCategory.mockReturnValue(false);
    mockCreateVideoGenBatch.mockResolvedValue(undefined);
    mockCreateVideoGenJobsBatch.mockResolvedValue(undefined);

    await expect(
      startListingVideoGeneration({
        listingId: "listing-1",
        userId: "user-1",
        resolvePublicDownloadUrls
      })
    ).rejects.toThrow("APP_URL must be configured");
  });

  it("creates secondary clip for priority categories when enabled", async () => {
    mockSelect.mockReturnValue(
      makeSelectBuilder([{ id: "img-1", url: "raw-1" }])
    );
    mockNanoid
      .mockReturnValueOnce("video-1")
      .mockReturnValueOnce("job-1")
      .mockReturnValueOnce("job-2");
    mockGroupImagesByCategory.mockReturnValue(
      new Map([["kitchen", [{ id: "img-1" }]]])
    );
    mockSelectListingPrimaryImage.mockReturnValue({
      url: "https://img/primary.jpg"
    });
    mockBuildRoomsFromImages.mockReturnValue([
      {
        id: "kitchen",
        name: "Kitchen",
        category: "kitchen",
        roomNumber: undefined
      }
    ]);
    mockGetCategoryForRoom.mockReturnValue("kitchen");
    mockSelectPrimaryImageForRoom.mockReturnValue(
      "https://img/kitchen-primary.jpg"
    );
    mockSelectSecondaryImageForRoom.mockReturnValue(
      "https://img/kitchen-secondary.jpg"
    );
    mockBuildPrompt
      .mockReturnValueOnce({
        prompt: "Primary prompt",
        templateKey: "interior-forward-pan"
      })
      .mockReturnValueOnce({
        prompt: "Secondary prompt",
        templateKey: "interior-center-push"
      });
    mockIsPriorityCategory.mockReturnValue(true);
    mockCreateVideoGenBatch.mockResolvedValue(undefined);
    mockCreateVideoGenJobsBatch.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ ok: true });

    const result = await startListingVideoGeneration({
      listingId: "listing-1",
      userId: "user-1",
      resolvePublicDownloadUrls
    });

    expect(mockCreateVideoGenJobsBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          generationSettings: expect.objectContaining({ clipIndex: 0 })
        }),
        expect.objectContaining({
          generationSettings: expect.objectContaining({ clipIndex: 1 })
        })
      ])
    );
    expect(result.jobCount).toBe(2);
  });
});
