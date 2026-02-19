const mockSelect = jest.fn();
const mockGetSignedDownloadUrlSafe = jest.fn();

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => (mockSelect as (...a: unknown[]) => unknown)(...args)
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

jest.mock("../../../utils/storageUrls", () => ({
  getSignedDownloadUrlSafe: (...args: unknown[]) =>
    mockGetSignedDownloadUrlSafe(...args)
}));

import { getListingVideoStatus } from "../service";

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

describe("videoStatus/service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty jobs when no video batch exists", async () => {
    mockSelect.mockReturnValueOnce(makeLatestBatchBuilder([]));

    await expect(getListingVideoStatus("listing-1")).resolves.toEqual({
      jobs: []
    });
  });

  it("maps job rows and signs URLs", async () => {
    mockSelect
      .mockReturnValueOnce(
        makeLatestBatchBuilder([{ id: "batch-1", status: "complete", errorMessage: null }])
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
              durationSeconds: 8,
              sortOrder: 2
            }
          }
        ])
      );

    mockGetSignedDownloadUrlSafe
      .mockResolvedValueOnce("signed-video")
      .mockResolvedValueOnce("signed-thumb");

    const result = await getListingVideoStatus("listing-1");

    expect(result).toEqual({
      jobs: [
        {
          listingId: "listing-1",
          jobId: "job-1",
          status: "complete",
          videoUrl: "signed-video",
          thumbnailUrl: "signed-thumb",
          generationModel: "kling",
          orientation: "portrait",
          errorMessage: null,
          roomId: "room-1",
          roomName: "Kitchen",
          category: "kitchen",
          durationSeconds: 8,
          isPriorityCategory: true,
          sortOrder: 2
        }
      ]
    });
    expect(mockGetSignedDownloadUrlSafe).toHaveBeenCalledTimes(2);
  });

  it("falls back to original urls and default fields when signing/settings are missing", async () => {
    mockSelect
      .mockReturnValueOnce(
        makeLatestBatchBuilder([{ id: "batch-2", status: "failed", errorMessage: "oops" }])
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

    mockGetSignedDownloadUrlSafe.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const result = await getListingVideoStatus("listing-2");

    expect(result).toEqual({
      jobs: [
        {
          listingId: "listing-2",
          jobId: "job-2",
          status: "failed",
          videoUrl: "raw-video",
          thumbnailUrl: "raw-thumb",
          generationModel: null,
          orientation: null,
          errorMessage: "failed",
          roomId: undefined,
          roomName: undefined,
          category: null,
          durationSeconds: null,
          isPriorityCategory: false,
          sortOrder: null
        }
      ]
    });
  });
});
