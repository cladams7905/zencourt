const mockSelect = jest.fn();
const mockGetPublicDownloadUrlSafe = jest.fn();
const mockUpdateVideoGenBatch = jest.fn();
const mockUpdateVideoGenJob = jest.fn();

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) =>
      (mockSelect as (...a: unknown[]) => unknown)(...args)
  },
  videoGenBatch: {
    id: "id",
    status: "status",
    errorMessage: "errorMessage",
    listingId: "listingId",
    createdAt: "createdAt"
  },
  videoGenJobs: {
    id: "id",
    status: "status",
    videoUrl: "videoUrl",
    thumbnailUrl: "thumbnailUrl",
    metadata: "metadata",
    errorMessage: "errorMessage",
    generationSettings: "generationSettings",
    videoGenBatchId: "videoGenBatchId",
    createdAt: "createdAt"
  },
  asc: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/models/videoGen", () => ({
  updateVideoGenBatch: (...args: unknown[]) =>
    (mockUpdateVideoGenBatch as (...a: unknown[]) => unknown)(...args),
  updateVideoGenJob: (...args: unknown[]) =>
    (mockUpdateVideoGenJob as (...a: unknown[]) => unknown)(...args)
}));

import { getListingVideoStatus, getVideoGenerationStatus } from "../status";

function makeLatestBatchBuilder(rows: unknown[]) {
  const builder = {
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn()
  } as Record<string, jest.Mock>;

  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.limit.mockResolvedValue(rows);

  return builder;
}

function makeJobsBuilder(rows: unknown[]) {
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

describe("videoGeneration/status/service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateVideoGenBatch.mockResolvedValue(undefined);
    mockUpdateVideoGenJob.mockResolvedValue(undefined);
  });

  it("returns empty jobs when no video batch exists", async () => {
    mockSelect.mockReturnValueOnce(makeLatestBatchBuilder([]));

    await expect(
      getListingVideoStatus("listing-1", mockGetPublicDownloadUrlSafe)
    ).resolves.toEqual({
      jobs: []
    });
  });

  it("maps job rows and signs URLs", async () => {
    mockSelect
      .mockReturnValueOnce(
        makeLatestBatchBuilder([
          { id: "batch-1", status: "complete", errorMessage: null }
        ])
      )
      .mockReturnValueOnce(
        makeJobsBuilder([
          {
            id: "job-1",
            status: "complete",
            videoUrl: "video-1",
            thumbnailUrl: "thumb-1",
            metadata: { orientation: "portrait" },
            errorMessage: null,
            generationSettings: {
              model: "kling",
              roomId: "room-1",
              roomName: "Kitchen",
              category: "kitchen",
              sortOrder: 2
            }
          }
        ])
      );

    mockGetPublicDownloadUrlSafe
      .mockReturnValueOnce("signed-video")
      .mockReturnValueOnce("signed-thumb");

    const result = await getListingVideoStatus(
      "listing-1",
      mockGetPublicDownloadUrlSafe
    );

    expect(result).toEqual({
      jobs: [
        {
          listingId: "listing-1",
          jobId: "job-1",
          status: "complete",
          videoUrl: "signed-video",
          thumbnailUrl: "signed-thumb",
          generationModel: "kling",
          prompt: null,
          imageUrls: null,
          orientation: "portrait",
          errorMessage: null,
          roomId: "room-1",
          roomName: "Kitchen",
          category: "kitchen",
          clipIndex: null,
          durationSeconds: null,
          isPriorityCategory: true,
          sortOrder: 2
        }
      ]
    });
    expect(mockGetPublicDownloadUrlSafe).toHaveBeenCalledTimes(2);
  });

  it("falls back to original urls and default fields when signing/settings are missing", async () => {
    mockSelect
      .mockReturnValueOnce(
        makeLatestBatchBuilder([
          { id: "batch-2", status: "failed", errorMessage: "oops" }
        ])
      )
      .mockReturnValueOnce(
        makeJobsBuilder([
          {
            id: "job-2",
            status: "failed",
            videoUrl: "raw-video",
            thumbnailUrl: "raw-thumb",
            metadata: null,
            errorMessage: "failed",
            generationSettings: null
          }
        ])
      );

    mockGetPublicDownloadUrlSafe
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);

    const result = await getListingVideoStatus(
      "listing-2",
      mockGetPublicDownloadUrlSafe
    );

    expect(result).toEqual({
      jobs: [
        {
          listingId: "listing-2",
          jobId: "job-2",
          status: "failed",
          videoUrl: "raw-video",
          thumbnailUrl: "raw-thumb",
          generationModel: null,
          prompt: null,
          imageUrls: null,
          orientation: null,
          errorMessage: "failed",
          roomId: undefined,
          roomName: undefined,
          category: null,
          clipIndex: null,
          durationSeconds: null,
          isPriorityCategory: false,
          sortOrder: null
        }
      ]
    });
  });

  it("fails a stale batch when the hard timeout is exceeded", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-20T10:31:00.000Z"));

    mockSelect
      .mockReturnValueOnce(
        makeLatestBatchBuilder([
          {
            id: "batch-3",
            status: "processing",
            errorMessage: null,
            createdAt: new Date("2026-03-20T10:00:00.000Z")
          }
        ])
      )
      .mockReturnValueOnce(
        makeJobsBuilder([
          {
            id: "job-3",
            status: "processing",
            videoUrl: null,
            thumbnailUrl: null,
            metadata: null,
            errorMessage: null,
            generationSettings: null
          }
        ])
      );

    const result = await getVideoGenerationStatus(
      "batch-3",
      mockGetPublicDownloadUrlSafe
    );

    expect(mockUpdateVideoGenJob).toHaveBeenCalledWith("job-3", {
      status: "failed",
      errorMessage:
        "Generation is taking longer than usual because the queue is busy. We'll keep trying."
    });
    expect(mockUpdateVideoGenBatch).toHaveBeenCalledWith("batch-3", {
      status: "failed",
      errorMessage:
        "Generation is taking longer than usual because the queue is busy. We'll keep trying."
    });
    expect(result).toEqual({
      batchId: "batch-3",
      status: "failed",
      createdAt: "2026-03-20T10:00:00.000Z",
      errorMessage:
        "Generation is taking longer than usual because the queue is busy. We'll keep trying.",
      totalJobs: 1,
      completedJobs: 0,
      failedJobs: 1,
      canceledJobs: 0,
      processingJobs: 0,
      pendingJobs: 0,
      isTerminal: true,
      allSucceeded: false
    });

    jest.useRealTimers();
  });
});
