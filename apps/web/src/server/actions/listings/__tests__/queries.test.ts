/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockGetUserListingSummariesPage = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetListingVideoStatus = jest.fn();
const mockGetListingImages = jest.fn();
const mockMapListingImageToDisplayItem = jest.fn((item) => item);
const mockGetAllCachedListingContentForCreate = jest.fn();
const mockGetCurrentClipVersionsByListingId = jest.fn();
const mockGetSuccessfulClipVersionsByClipId = jest.fn();
const mockCreateClipVersion = jest.fn();

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
  getCurrentClipVersionsByListingId: (...args: unknown[]) =>
    (mockGetCurrentClipVersionsByListingId as (...a: unknown[]) => unknown)(
      ...args
    ),
  getSuccessfulClipVersionsByClipId: (...args: unknown[]) =>
    (mockGetSuccessfulClipVersionsByClipId as (...a: unknown[]) => unknown)(
      ...args
    ),
  createClipVersion: (...args: unknown[]) =>
    (mockCreateClipVersion as (...a: unknown[]) => unknown)(...args)
}));

import {
  getCurrentUserListingSummariesPage,
  getListingCreateViewDataForCurrentUser
} from "@web/src/server/actions/listings/queries";

describe("listings queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetCurrentClipVersionsByListingId.mockResolvedValue([]);
    mockGetSuccessfulClipVersionsByClipId.mockResolvedValue([]);
    mockCreateClipVersion.mockResolvedValue(undefined);
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
          sortOrder: 1
        }
      ]
    });
    mockGetCurrentClipVersionsByListingId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "clip-version-1",
          clipId: "listing-1:kitchen:0",
          thumbnailUrl: "https://t",
          videoUrl: "https://v",
          roomName: "Kitchen",
          roomId: null,
          clipIndex: 0,
          sortOrder: 1,
          aiDirections: "",
          versionNumber: 1,
          isCurrent: true,
          status: "completed",
          category: "kitchen",
          durationSeconds: 4,
          orientation: "vertical",
          generationModel: "veo3.1_fast"
        }
      ]);
    mockGetSuccessfulClipVersionsByClipId.mockResolvedValueOnce([
      {
        id: "clip-version-1",
        clipId: "listing-1:kitchen:0",
        thumbnailUrl: "https://t",
        videoUrl: "https://v",
        roomName: "Kitchen",
        roomId: null,
        clipIndex: 0,
        sortOrder: 1,
        aiDirections: "",
        versionNumber: 1,
        isCurrent: true,
        status: "completed",
        category: "kitchen",
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
    expect(mockCreateClipVersion).toHaveBeenCalledTimes(1);
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
});
