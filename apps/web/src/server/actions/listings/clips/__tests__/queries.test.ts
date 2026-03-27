/** @jest-environment node */

const mockGetListingVideoStatus = jest.fn();
const mockCreateVideoClip = jest.fn();
const mockCreateVideoClipVersion = jest.fn();
const mockGetCurrentVideoClipVersionsByListingId = jest.fn();
const mockGetCurrentVideoClipsWithCurrentVersionsByListingId = jest.fn();
const mockGetSuccessfulVideoClipVersionsByClipIds = jest.fn();
const mockGetVideoClipById = jest.fn();
const mockGetVideoClipVersionById = jest.fn();
const mockGetVideoClipVersionBySourceVideoGenJobId = jest.fn();
const mockUpdateVideoClip = jest.fn();

jest.mock("nanoid", () => ({
  nanoid: () => "generated-version-id"
}));

jest.mock("@web/src/server/services/videoGeneration", () => ({
  getListingVideoStatus: (...args: unknown[]) =>
    mockGetListingVideoStatus(...args)
}));

jest.mock("@web/src/server/models/video", () => ({
  createVideoClip: (...args: unknown[]) => mockCreateVideoClip(...args),
  createVideoClipVersion: (...args: unknown[]) =>
    mockCreateVideoClipVersion(...args),
  getCurrentVideoClipVersionsByListingId: (...args: unknown[]) =>
    mockGetCurrentVideoClipVersionsByListingId(...args),
  getCurrentVideoClipsWithCurrentVersionsByListingId: (...args: unknown[]) =>
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId(...args),
  getSuccessfulVideoClipVersionsByClipIds: (...args: unknown[]) =>
    mockGetSuccessfulVideoClipVersionsByClipIds(...args),
  getVideoClipById: (...args: unknown[]) => mockGetVideoClipById(...args),
  getVideoClipVersionById: (...args: unknown[]) =>
    mockGetVideoClipVersionById(...args),
  getVideoClipVersionBySourceVideoGenJobId: (...args: unknown[]) =>
    mockGetVideoClipVersionBySourceVideoGenJobId(...args),
  updateVideoClip: (...args: unknown[]) => mockUpdateVideoClip(...args)
}));

import { ApiError } from "@web/src/server/errors/api";
import {
  getListingClipDownload,
  getListingClipVersionItems
} from "@web/src/server/actions/listings/clips/queries";

describe("listing clips queries", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("seeds missing completed clip jobs and falls back to the latest successful version when current failed", async () => {
    mockGetListingVideoStatus.mockResolvedValue({
      jobs: [
        {
          jobId: "job-1",
          status: "completed",
          roomId: "room-1",
          roomName: " Kitchen ",
          category: "kitchen",
          clipIndex: 1,
          sortOrder: 2,
          videoUrl: "https://example.com/generated.mp4",
          thumbnailUrl: "https://example.com/generated.jpg",
          durationSeconds: 3.6,
          orientation: "vertical",
          generationModel: "veo3.1_fast",
          imageUrls: ["https://example.com/still.jpg"],
          prompt: "show kitchen"
        },
        {
          jobId: "job-2",
          status: "processing",
          roomName: "Ignore me",
          clipIndex: 2
        },
        {
          jobId: "job-3",
          status: "completed",
          roomName: "No media",
          clipIndex: 3,
          videoUrl: null,
          thumbnailUrl: null
        }
      ]
    });
    mockGetCurrentVideoClipVersionsByListingId.mockResolvedValue([
      null,
      {
        videoClipId: "existing-clip",
        versionNumber: 2,
        sourceVideoGenJobId: "existing-job"
      }
    ]);
    mockGetVideoClipVersionBySourceVideoGenJobId.mockResolvedValue(null);
    mockGetVideoClipById.mockResolvedValueOnce(null);
    mockCreateVideoClip.mockResolvedValue(undefined);
    mockCreateVideoClipVersion.mockResolvedValue(undefined);
    mockUpdateVideoClip.mockResolvedValue(undefined);
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId.mockResolvedValue([
      null,
      {
        clip: {
          id: "listing-1:room-1:1",
          roomName: "Kitchen",
          roomId: "room-1",
          clipIndex: 1,
          sortOrder: 2
        },
        clipVersion: {
          id: "clip-version-failed",
          thumbnailUrl: "https://example.com/failed.jpg",
          videoUrl: "https://example.com/failed.mp4",
          durationSeconds: 4,
          generationModel: "veo3.1_fast",
          orientation: "vertical",
          aiDirections: "retry",
          versionNumber: 3,
          status: "failed",
          createdAt: "2026-01-01T00:00:00.000Z"
        }
      }
    ]);
    mockGetSuccessfulVideoClipVersionsByClipIds.mockResolvedValue(
      new Map([
        [
          "listing-1:room-1:1",
          [
            {
              id: "clip-version-success",
              thumbnailUrl: "https://example.com/success.jpg",
              videoUrl: "https://example.com/success.mp4",
              durationSeconds: 3,
              generationModel: "veo3.1_fast",
              orientation: "vertical",
              aiDirections: "",
              versionNumber: 2,
              status: "completed",
              createdAt: "2025-12-31T00:00:00.000Z"
            }
          ]
        ]
      ])
    );

    const result = await getListingClipVersionItems("listing-1");

    expect(mockCreateVideoClip).toHaveBeenCalledWith({
      id: "listing-1:room-1:1",
      listingId: "listing-1",
      roomId: "room-1",
      roomName: "Kitchen",
      category: "kitchen",
      clipIndex: 1,
      sortOrder: 2,
      currentVideoClipVersionId: null
    });
    expect(mockCreateVideoClipVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "generated-version-id",
        videoClipId: "listing-1:room-1:1",
        versionNumber: 1,
        durationSeconds: 4,
        sourceVideoGenJobId: "job-1"
      })
    );
    expect(mockUpdateVideoClip).toHaveBeenCalledWith("listing-1:room-1:1", {
      currentVideoClipVersionId: "generated-version-id"
    });
    expect(result).toEqual([
      expect.objectContaining({
        clipId: "listing-1:room-1:1",
        currentVersion: expect.objectContaining({
          clipVersionId: "clip-version-success",
          versionStatus: "completed"
        }),
        inFlightVersion: expect.objectContaining({
          clipVersionId: "clip-version-failed",
          versionStatus: "failed"
        })
      })
    ]);
  });

  it("skips seeding when a job version is already persisted", async () => {
    mockGetListingVideoStatus.mockResolvedValue({
      jobs: [
        {
          jobId: "job-1",
          status: "completed",
          roomName: "Kitchen",
          clipIndex: 1,
          videoUrl: "https://example.com/generated.mp4",
          thumbnailUrl: "https://example.com/generated.jpg"
        }
      ]
    });
    mockGetCurrentVideoClipVersionsByListingId.mockResolvedValue([]);
    mockGetVideoClipVersionBySourceVideoGenJobId.mockResolvedValue({
      videoClipId: "clip-1",
      versionNumber: 4
    });
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId.mockResolvedValue([]);
    mockGetSuccessfulVideoClipVersionsByClipIds.mockResolvedValue(new Map());

    const result = await getListingClipVersionItems("listing-1");

    expect(mockCreateVideoClip).not.toHaveBeenCalled();
    expect(mockCreateVideoClipVersion).not.toHaveBeenCalled();
    expect(mockUpdateVideoClip).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns a downloadable clip payload with a sanitized filename", async () => {
    mockGetVideoClipVersionById.mockResolvedValue({
      id: "clip-version-1",
      videoClipId: "clip-1",
      videoUrl: "https://example.com/kitchen.mp4",
      versionNumber: 2
    });
    mockGetVideoClipById.mockResolvedValue({
      id: "clip-1",
      listingId: "listing-1",
      roomName: "Kitchen / Main Level"
    });

    await expect(
      getListingClipDownload("listing-1", "clip-version-1")
    ).resolves.toEqual({
      videoUrl: "https://example.com/kitchen.mp4",
      filename: "kitchen-main-level-v2.mp4"
    });
  });

  it("throws not found when the clip version is missing or belongs to another listing", async () => {
    mockGetVideoClipVersionById.mockResolvedValueOnce(null);

    await expect(
      getListingClipDownload("listing-1", "missing")
    ).rejects.toBeInstanceOf(ApiError);

    mockGetVideoClipVersionById.mockResolvedValueOnce({
      id: "clip-version-1",
      videoClipId: "clip-1",
      videoUrl: "https://example.com/kitchen.mp4",
      versionNumber: 1
    });
    mockGetVideoClipById.mockResolvedValueOnce({
      id: "clip-1",
      listingId: "another-listing"
    });

    await expect(
      getListingClipDownload("listing-1", "clip-version-1")
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("throws bad request when the clip has no downloadable video url", async () => {
    mockGetVideoClipVersionById.mockResolvedValue({
      id: "clip-version-1",
      videoClipId: "clip-1",
      videoUrl: null,
      versionNumber: 1
    });
    mockGetVideoClipById.mockResolvedValue({
      id: "clip-1",
      listingId: "listing-1",
      roomName: "Kitchen"
    });

    await expect(
      getListingClipDownload("listing-1", "clip-version-1")
    ).rejects.toBeInstanceOf(ApiError);
  });
});
