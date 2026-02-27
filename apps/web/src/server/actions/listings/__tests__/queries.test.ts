/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockGetUserListingSummariesPage = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetListingVideoStatus = jest.fn();
const mockGetListingImages = jest.fn();
const mockMapListingImageToDisplayItem = jest.fn((item) => item);
const mockGetAllCachedListingContentForCreate = jest.fn();

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

import {
  getCurrentUserListingSummariesPage,
  getListingCreateViewDataForCurrentUser
} from "@web/src/server/actions/listings/queries";

describe("listings queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
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
          sortOrder: 1
        }
      ]
    });
    mockGetListingImages.mockResolvedValueOnce([{ id: "img-1" }]);
    mockGetAllCachedListingContentForCreate.mockResolvedValueOnce([
      { id: "cached-1" }
    ]);
    mockMapListingImageToDisplayItem.mockReturnValueOnce({ id: "img-1-mapped" });

    const result = await getListingCreateViewDataForCurrentUser("listing-1");

    expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
    expect(mockGetListingVideoStatus).toHaveBeenCalledWith("listing-1");
    expect(mockGetListingImages).toHaveBeenCalledWith("user-1", "listing-1");
    expect(mockGetAllCachedListingContentForCreate).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1"
    });
    expect(result).toEqual({
      videoItems: [
        expect.objectContaining({
          id: "job-1",
          videoUrl: "https://v",
          thumbnail: "https://t"
        })
      ],
      listingPostItems: [{ id: "cached-1" }],
      listingImages: [{ id: "img-1-mapped" }]
    });
  });
});
