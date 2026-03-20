const mockNanoid = jest.fn();
const mockCreateVideoGenBatch = jest.fn();
const mockCreateVideoGenJobsBatch = jest.fn();
const mockCreateVideoClipVersion = jest.fn();
const mockGetVideoClipById = jest.fn();
const mockGetVideoClipVersionById = jest.fn();
const mockGetLatestVideoClipVersionByClipId = jest.fn();
const mockUpdateVideoClip = jest.fn();
const mockUpdateVideoGenJob = jest.fn();
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
var mockLoggerInfo = jest.fn();
var mockLoggerError = jest.fn();

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

jest.mock("@web/src/server/models/videoGen", () => ({
  createVideoGenBatch: (...args: unknown[]) => mockCreateVideoGenBatch(...args),
  createVideoGenJobsBatch: (...args: unknown[]) =>
    mockCreateVideoGenJobsBatch(...args),
  createVideoClipVersion: (...args: unknown[]) =>
    mockCreateVideoClipVersion(...args),
  updateVideoGenJob: (...args: unknown[]) => mockUpdateVideoGenJob(...args),
  getVideoClipById: (...args: unknown[]) => mockGetVideoClipById(...args),
  getVideoClipVersionById: (...args: unknown[]) =>
    mockGetVideoClipVersionById(...args),
  getLatestVideoClipVersionByClipId: (...args: unknown[]) =>
    mockGetLatestVideoClipVersionByClipId(...args),
  updateVideoClip: (...args: unknown[]) => mockUpdateVideoClip(...args)
}));

jest.mock("@web/src/server/services/videoGeneration/domain/rooms", () => ({
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

jest.mock("@web/src/server/services/videoGeneration/domain/prompt", () => ({
  buildPrompt: (...args: unknown[]) => mockBuildPrompt(...args)
}));

jest.mock("@web/src/server/services/videoGeneration/config", () => ({
  getVideoGenerationConfig: (...args: unknown[]) =>
    mockGetVideoGenerationConfig(...args)
}));

jest.mock("@shared/utils", () => ({
  isPriorityCategory: (...args: unknown[]) => mockIsPriorityCategory(...args)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  createChildLogger: () => ({
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args)
  })
}));

jest.mock("@web/src/server/errors/api", () => {
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

import {
  regenerateListingClipVersion,
  startListingVideoGeneration
} from "../helpers";

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

describe("video actions/helpers", () => {
  const resolvePublicDownloadUrls = (urls: string[]) =>
    urls.map((url) => `https://signed/${url.split("/").pop()}`);

  beforeEach(() => {
    jest.clearAllMocks();
    mockNanoid.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockGetVideoGenerationConfig.mockReturnValue({
      model: "veo3.1_fast",
      defaultOrientation: "vertical",
      enablePrioritySecondary: true,
      videoServerBaseUrl: "http://video-server",
      videoServerApiKey: "secret",
      appUrl: "https://example.vercel.app"
    });
    mockCreateVideoClipVersion.mockResolvedValue(undefined);
    mockUpdateVideoClip.mockResolvedValue(undefined);
    mockUpdateVideoGenJob.mockResolvedValue(undefined);
    mockGetLatestVideoClipVersionByClipId.mockResolvedValue(null);
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
      batchId: "video-1",
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

  it("creates one pending clip version and one queued job for regeneration", async () => {
    mockNanoid
      .mockReturnValueOnce("video-2")
      .mockReturnValueOnce("job-2")
      .mockReturnValueOnce("clip-version-2");
    mockGetVideoClipById.mockResolvedValueOnce({
      id: "clip-1",
      listingId: "listing-1",
      currentVideoClipVersionId: "clip-version-1",
      roomId: "room-1",
      roomName: "Kitchen",
      category: "kitchen",
      clipIndex: 0,
      sortOrder: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    });
    mockGetVideoClipVersionById.mockResolvedValueOnce({
      id: "clip-version-1",
      videoClipId: "clip-1",
      versionNumber: 1,
      status: "completed",
      videoUrl: "https://old/video.mp4",
      thumbnailUrl: "https://old/thumb.jpg",
      durationSeconds: 4,
      metadata: { duration: 4, orientation: "vertical" },
      errorMessage: null,
      orientation: "vertical",
      generationModel: "veo3.1_fast",
      imageUrls: ["https://signed/kitchen.jpg"],
      prompt: "Forward pan through the Kitchen.",
      aiDirections: "Old directions",
      sourceVideoGenJobId: "job-1"
    });
    mockCreateVideoGenBatch.mockResolvedValue(undefined);
    mockCreateVideoGenJobsBatch.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ ok: true });

    const result = await regenerateListingClipVersion({
      listingId: "listing-1",
      userId: "user-1",
      clipId: "clip-1",
      aiDirections: "Use warmer late afternoon light",
      resolvePublicDownloadUrls
    });

    expect(mockCreateVideoClipVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "clip-version-2",
        videoClipId: "clip-1",
        versionNumber: 2,
        status: "pending",
        aiDirections: "Use warmer late afternoon light"
      })
    );
    expect(mockCreateVideoGenJobsBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "job-2",
        videoClipVersionId: null,
        generationSettings: expect.objectContaining({
          roomName: "Kitchen",
          clipIndex: 0,
          aiDirections: "Use warmer late afternoon light"
        })
      })
    ]);
    expect(mockUpdateVideoGenJob).toHaveBeenCalledWith("job-2", {
      videoClipVersionId: "clip-version-2"
    });
    expect(
      mockCreateVideoGenJobsBatch.mock.invocationCallOrder[0]
    ).toBeLessThan(mockCreateVideoClipVersion.mock.invocationCallOrder[0]);
    expect(result).toEqual({
      clipId: "clip-1",
      clipVersionId: "clip-version-2",
      batchId: "video-2"
    });
  });

  it("logs and rethrows regenerate failures", async () => {
    mockNanoid
      .mockReturnValueOnce("video-2")
      .mockReturnValueOnce("job-2")
      .mockReturnValueOnce("clip-version-2");
    mockGetVideoClipById.mockResolvedValueOnce({
      id: "clip-1",
      listingId: "listing-1",
      currentVideoClipVersionId: "clip-version-1",
      roomId: "room-1",
      roomName: "Kitchen",
      category: "kitchen",
      clipIndex: 0,
      sortOrder: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    });
    mockGetVideoClipVersionById.mockResolvedValueOnce({
      id: "clip-version-1",
      videoClipId: "clip-1",
      versionNumber: 1,
      status: "completed",
      videoUrl: "https://old/video.mp4",
      thumbnailUrl: "https://old/thumb.jpg",
      durationSeconds: 4,
      metadata: { duration: 4, orientation: "vertical" },
      errorMessage: null,
      orientation: "vertical",
      generationModel: "veo3.1_fast",
      imageUrls: ["https://signed/kitchen.jpg"],
      prompt: "Forward pan through the Kitchen.",
      aiDirections: "Old directions",
      sourceVideoGenJobId: "job-1"
    });
    mockCreateVideoGenBatch.mockResolvedValue(undefined);
    mockCreateVideoGenJobsBatch.mockResolvedValue(undefined);
    mockFetch.mockRejectedValue(new Error("video server down"));

    await expect(
      regenerateListingClipVersion({
        listingId: "listing-1",
        userId: "user-1",
        clipId: "clip-1",
        aiDirections: "Use warmer late afternoon light",
        resolvePublicDownloadUrls
      })
    ).rejects.toThrow("video server down");

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: "listing-1",
        userId: "user-1",
        clipId: "clip-1",
        error: expect.any(Error)
      }),
      "Failed to regenerate listing clip version"
    );
  });

  it("fails early when regenerate inputs are missing", async () => {
    mockGetVideoClipById.mockResolvedValueOnce({
      id: "clip-1",
      listingId: "listing-1",
      currentVideoClipVersionId: "clip-version-1",
      roomId: "room-1",
      roomName: "Kitchen",
      category: "kitchen",
      clipIndex: 0,
      sortOrder: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    });
    mockGetVideoClipVersionById.mockResolvedValueOnce({
      id: "clip-version-1",
      videoClipId: "clip-1",
      versionNumber: 1,
      status: "completed",
      videoUrl: "https://old/video.mp4",
      thumbnailUrl: "https://old/thumb.jpg",
      durationSeconds: 4,
      metadata: { duration: 4, orientation: "vertical" },
      errorMessage: null,
      orientation: "vertical",
      generationModel: "veo3.1_fast",
      imageUrls: [],
      prompt: "",
      aiDirections: "Old directions",
      sourceVideoGenJobId: "job-1"
    });

    await expect(
      regenerateListingClipVersion({
        listingId: "listing-1",
        userId: "user-1",
        clipId: "clip-1",
        resolvePublicDownloadUrls
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 400,
        body: expect.objectContaining({
          message:
            "This clip cannot be regenerated yet because its original generation inputs are missing."
        })
      })
    );

    expect(mockCreateVideoGenBatch).not.toHaveBeenCalled();
    expect(mockCreateVideoGenJobsBatch).not.toHaveBeenCalled();
    expect(mockCreateVideoClipVersion).not.toHaveBeenCalled();
  });

  it("uses the latest existing version number when the current clip pointer is stale", async () => {
    mockNanoid
      .mockReturnValueOnce("video-2")
      .mockReturnValueOnce("job-2")
      .mockReturnValueOnce("clip-version-3");
    mockGetVideoClipById.mockResolvedValueOnce({
      id: "clip-1",
      listingId: "listing-1",
      currentVideoClipVersionId: "clip-version-1",
      roomId: "room-1",
      roomName: "Kitchen",
      category: "kitchen",
      clipIndex: 0,
      sortOrder: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    });
    mockGetVideoClipVersionById.mockResolvedValueOnce({
      id: "clip-version-1",
      videoClipId: "clip-1",
      versionNumber: 1,
      status: "completed",
      videoUrl: "https://old/video.mp4",
      thumbnailUrl: "https://old/thumb.jpg",
      durationSeconds: 4,
      metadata: { duration: 4, orientation: "vertical" },
      errorMessage: null,
      orientation: "vertical",
      generationModel: "veo3.1_fast",
      imageUrls: ["https://signed/kitchen.jpg"],
      prompt: "Forward pan through the Kitchen.",
      aiDirections: "Old directions",
      sourceVideoGenJobId: "job-1"
    });
    mockGetLatestVideoClipVersionByClipId.mockResolvedValueOnce({
      id: "clip-version-2",
      videoClipId: "clip-1",
      versionNumber: 2,
      status: "completed",
      videoUrl: "https://newer/video.mp4",
      thumbnailUrl: "https://newer/thumb.jpg",
      durationSeconds: 4,
      metadata: { duration: 4, orientation: "vertical" },
      errorMessage: null,
      orientation: "vertical",
      generationModel: "veo3.1_fast",
      imageUrls: ["https://signed/kitchen.jpg"],
      prompt: "Forward pan through the Kitchen.",
      aiDirections: "Old directions",
      sourceVideoGenJobId: "job-older"
    });
    mockCreateVideoGenBatch.mockResolvedValue(undefined);
    mockCreateVideoGenJobsBatch.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ ok: true });

    await regenerateListingClipVersion({
      listingId: "listing-1",
      userId: "user-1",
      clipId: "clip-1",
      aiDirections: "Use warmer late afternoon light",
      resolvePublicDownloadUrls
    });

    expect(mockCreateVideoClipVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "clip-version-3",
        videoClipId: "clip-1",
        versionNumber: 3
      })
    );
    expect(mockUpdateVideoClip).toHaveBeenCalledWith("clip-1", {
      currentVideoClipVersionId: "clip-version-3"
    });
  });
});
