/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockGetUserListingSummariesPage = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetListingVideoStatus = jest.fn();
const mockGetListingImages = jest.fn();
const mockMapListingImageToDisplayItem = jest.fn((item) => item);
const mockGetAllCachedListingContentForCreate = jest.fn();
const mockGetCurrentVideoClipVersionsByListingId = jest.fn();
const mockGetSuccessfulVideoClipVersionsByClipId = jest.fn();
const mockCreateVideoClip = jest.fn();
const mockCreateVideoClipVersion = jest.fn();
const mockGetVideoClipById = jest.fn();
const mockGetVideoClipVersionBySourceVideoGenJobId = jest.fn();
const mockUpdateVideoClip = jest.fn();

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings", () => ({
  getUserListingSummariesPage: (...args: unknown[]) =>
    (mockGetUserListingSummariesPage as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/videoGeneration", () => ({
  getListingVideoStatus: (...args: unknown[]) =>
    (mockGetListingVideoStatus as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listingImages", () => ({
  getListingImages: (...args: unknown[]) =>
    (mockGetListingImages as (...a: unknown[]) => unknown)(...args),
  mapListingImageToDisplayItem: (...args: unknown[]) =>
    (mockMapListingImageToDisplayItem as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/infra/cache/listingContent/cache", () => ({
  getAllCachedListingContentForCreate: (...args: unknown[]) =>
    (mockGetAllCachedListingContentForCreate as (...a: unknown[]) => unknown)(
      ...args
    )
}));

jest.mock("@web/src/server/models/videoGen", () => ({
  getCurrentVideoClipVersionsByListingId: (...args: unknown[]) =>
    (mockGetCurrentVideoClipVersionsByListingId as (
      ...a: unknown[]
    ) => unknown)(
      ...args
    ),
  getSuccessfulVideoClipVersionsByClipId: (...args: unknown[]) =>
    (mockGetSuccessfulVideoClipVersionsByClipId as (
      ...a: unknown[]
    ) => unknown)(
      ...args
    ),
  createVideoClip: (...args: unknown[]) =>
    (mockCreateVideoClip as (...a: unknown[]) => unknown)(...args),
  createVideoClipVersion: (...args: unknown[]) =>
    (mockCreateVideoClipVersion as (...a: unknown[]) => unknown)(...args),
  getVideoClipById: (...args: unknown[]) =>
    (mockGetVideoClipById as (...a: unknown[]) => unknown)(...args),
  getVideoClipVersionBySourceVideoGenJobId: (...args: unknown[]) =>
    (mockGetVideoClipVersionBySourceVideoGenJobId as (
      ...a: unknown[]
    ) => unknown)(...args),
  updateVideoClip: (...args: unknown[]) =>
    (mockUpdateVideoClip as (...a: unknown[]) => unknown)(...args)
}));

import {
  getCurrentUserListingSummariesPage,
  getListingCreateViewDataForCurrentUser
} from "@web/src/server/actions/listings/queries";

describe("listings queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetCurrentVideoClipVersionsByListingId.mockResolvedValue([]);
    mockGetSuccessfulVideoClipVersionsByClipId.mockResolvedValue([]);
    mockCreateVideoClip.mockResolvedValue(undefined);
    mockCreateVideoClipVersion.mockResolvedValue(undefined);
    mockGetVideoClipById.mockResolvedValue(null);
    mockGetVideoClipVersionBySourceVideoGenJobId.mockResolvedValue(null);
    mockUpdateVideoClip.mockResolvedValue(undefined);
  });

  it("delegates to getUserListingSummariesPage with current user id", async () => {
    mockGetUserListingSummariesPage.mockResolvedValueOnce({
      rows: [{ id: "listing-1" }],
      total: 1
    });

    const result = await getCurrentUserListingSummariesPage({
      limit: 20,
      offset: 40
    });

    expect(mockGetUserListingSummariesPage).toHaveBeenCalledWith("user-1", {
      limit: 20,
      offset: 40
    });
    expect(result).toEqual({
      rows: [{ id: "listing-1" }],
      total: 1
    });
  });

  it("loads create-view data through action layer for current user", async () => {
    mockGetListingVideoStatus.mockResolvedValueOnce({
      jobs: [
        {
          jobId: "job-1",
          videoUrl: "https://v",
          thumbnailUrl: "https://t",
          roomName: "Kitchen",
          clipIndex: 0,
          sortOrder: 1,
          prompt: "Forward pan through the Kitchen.",
          imageUrls: ["https://signed/kitchen.jpg"]
        }
      ]
    });
    mockGetCurrentVideoClipVersionsByListingId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "clip-version-1",
          videoClipId: "listing-1:kitchen:0",
          thumbnailUrl: "https://t",
          videoUrl: "https://v",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          roomName: "Kitchen",
          roomId: null,
          category: "kitchen",
          clipIndex: 0,
          sortOrder: 1,
          aiDirections: "",
          versionNumber: 1,
          status: "completed",
          durationSeconds: 4,
          orientation: "vertical",
          generationModel: "veo3.1_fast"
        }
      ]);
    mockGetVideoClipById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "listing-1:kitchen:0",
        listingId: "listing-1",
        roomId: null,
        roomName: "Kitchen",
        category: "kitchen",
        clipIndex: 0,
        sortOrder: 1,
        currentVideoClipVersionId: "clip-version-1"
      });
    mockGetSuccessfulVideoClipVersionsByClipId.mockResolvedValueOnce([
      {
        id: "clip-version-1",
        videoClipId: "listing-1:kitchen:0",
        thumbnailUrl: "https://t",
        videoUrl: "https://v",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        roomName: "Kitchen",
        roomId: null,
        category: "kitchen",
        clipIndex: 0,
        sortOrder: 1,
        aiDirections: "",
        versionNumber: 1,
        status: "completed",
        durationSeconds: 4,
        orientation: "vertical",
        generationModel: "veo3.1_fast"
      }
    ]);
    mockGetListingImages.mockResolvedValueOnce([{ id: "img-1" }]);
    mockGetAllCachedListingContentForCreate.mockResolvedValueOnce([
      { id: "cached-1" }
    ]);
    mockMapListingImageToDisplayItem.mockReturnValueOnce({ id: "img-1-mapped" });

    const result = await getListingCreateViewDataForCurrentUser("listing-1");

    expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
    expect(mockGetListingVideoStatus).toHaveBeenCalledWith("listing-1");
    expect(mockCreateVideoClip).toHaveBeenCalledTimes(1);
    expect(mockCreateVideoClipVersion).toHaveBeenCalledTimes(1);
    expect(mockGetVideoClipById).toHaveBeenCalledWith("listing-1:kitchen:0");
    expect(mockUpdateVideoClip).toHaveBeenCalledWith("listing-1:kitchen:0", {
      currentVideoClipVersionId: expect.any(String)
    });
    expect(mockCreateVideoClipVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Forward pan through the Kitchen.",
        imageUrls: ["https://signed/kitchen.jpg"]
      })
    );
    expect(mockGetListingImages).toHaveBeenCalledWith("user-1", "listing-1");
    expect(mockGetAllCachedListingContentForCreate).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1"
    });
    expect(result).toEqual({
      videoItems: [
        expect.objectContaining({
          id: "listing-1:kitchen:0",
          clipVersionId: "clip-version-1",
          videoUrl: "https://v",
          thumbnail: "https://t",
          roomName: "Kitchen"
        })
      ],
      clipVersionItems: [
        expect.objectContaining({
          clipId: "listing-1:kitchen:0",
          roomName: "Kitchen"
        })
      ],
      listingPostItems: [{ id: "cached-1" }],
      listingImages: [{ id: "img-1-mapped" }]
    });
  });

  it("seeds completed regeneration jobs as the next version for an existing clip", async () => {
    mockGetListingVideoStatus.mockResolvedValueOnce({
      jobs: [
        {
          jobId: "job-2",
          status: "completed",
          videoUrl: "https://v2",
          thumbnailUrl: "https://t2",
          roomName: "Exterior Front",
          category: "exterior-front",
          clipIndex: 0,
          sortOrder: 0,
          prompt: "Aerial flyover of the front of the house.",
          imageUrls: ["https://signed/front.jpg"]
        }
      ]
    });
    mockGetCurrentVideoClipVersionsByListingId
      .mockResolvedValueOnce([
        {
          id: "clip-version-2",
          videoClipId: "listing-1:exterior-front:0",
          sourceVideoGenJobId: "job-1",
          versionNumber: 2
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "clip-version-3",
          videoClipId: "listing-1:exterior-front:0",
          thumbnailUrl: "https://t2",
          videoUrl: "https://v2",
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
          aiDirections: "",
          versionNumber: 3,
          status: "completed",
          durationSeconds: 4,
          orientation: "vertical",
          generationModel: "veo3.1_fast"
        }
      ]);
    mockGetVideoClipById
      .mockResolvedValueOnce({
        id: "listing-1:exterior-front:0",
        listingId: "listing-1",
        roomId: null,
        roomName: "Exterior Front",
        category: "exterior-front",
        clipIndex: 0,
        sortOrder: 0,
        currentVideoClipVersionId: "clip-version-2"
      })
      .mockResolvedValueOnce({
        id: "listing-1:exterior-front:0",
        listingId: "listing-1",
        roomId: null,
        roomName: "Exterior Front",
        category: "exterior-front",
        clipIndex: 0,
        sortOrder: 0,
        currentVideoClipVersionId: "clip-version-3"
      });
    mockGetSuccessfulVideoClipVersionsByClipId.mockResolvedValueOnce([
      {
        id: "clip-version-3",
        videoClipId: "listing-1:exterior-front:0",
        thumbnailUrl: "https://t2",
        videoUrl: "https://v2",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        aiDirections: "",
        versionNumber: 3,
        status: "completed",
        durationSeconds: 4,
        orientation: "vertical",
        generationModel: "veo3.1_fast"
      }
    ]);
    mockGetListingImages.mockResolvedValueOnce([]);
    mockGetAllCachedListingContentForCreate.mockResolvedValueOnce([]);

    await getListingCreateViewDataForCurrentUser("listing-1");

    expect(mockCreateVideoClip).not.toHaveBeenCalled();
    expect(mockCreateVideoClipVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        videoClipId: "listing-1:exterior-front:0",
        versionNumber: 3,
        sourceVideoGenJobId: "job-2"
      })
    );
  });
});
