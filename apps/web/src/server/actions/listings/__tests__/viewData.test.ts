/** @jest-environment node */
const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetListingClipVersionItems = jest.fn();
const mockGetListingImages = jest.fn();
const mockMapListingImageToDisplayItem = jest.fn((item) => item);
const mockGetListingContentItems = jest.fn();
const mockGetContentByListingId = jest.fn();
const mockGetAllCachedListingContentForCreate = jest.fn();
const mockGetUserMediaByIds = jest.fn();
const mockCountUserMediaVideos = jest.fn();
const mockMapUserMediaToVideoItem = jest.fn();

jest.mock("@web/src/server/actions/shared/auth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args),
  withCurrentUserListingAccess: async (
    listingIdOrResolver: string | ((context: { user: { id: string } }) => string | Promise<string>),
    run: (context: { user: { id: string }; listing: unknown }) => unknown
  ) => {
    const user = await mockRequireAuthenticatedUser();
    const listingId =
      typeof listingIdOrResolver === "function"
        ? await listingIdOrResolver({ user })
        : listingIdOrResolver;
    const listing = await mockRequireListingAccess(listingId, user.id);
    return run({ user, listing });
  }
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/listings/clips", () => ({
  getListingClipVersionItems: (...args: unknown[]) =>
    (mockGetListingClipVersionItems as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings/images", () => ({
  getListingImages: (...args: unknown[]) =>
    (mockGetListingImages as (...a: unknown[]) => unknown)(...args),
  mapListingImageToDisplayItem: (...args: unknown[]) =>
    (mockMapListingImageToDisplayItem as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/listings/content/items", () => ({
  getListingContentItems: (...args: unknown[]) =>
    (mockGetListingContentItems as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/content", () => ({
  getContentByListingId: (...args: unknown[]) =>
    (mockGetContentByListingId as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/infra/cache/listingContent/cache", () => ({
  getAllCachedListingContentForCreate: (...args: unknown[]) =>
    (mockGetAllCachedListingContentForCreate as (...a: unknown[]) => unknown)(
      ...args
    )
}));

jest.mock("@web/src/server/models/user", () => ({
  getUserMediaByIds: (...args: unknown[]) =>
    (mockGetUserMediaByIds as (...a: unknown[]) => unknown)(...args),
  countUserMediaVideos: (...args: unknown[]) =>
    (mockCountUserMediaVideos as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/listings/content/reels", () => {
  const actual = jest.requireActual(
    "@web/src/server/actions/listings/content/reels"
  ) as typeof import("@web/src/server/actions/listings/content/reels");
  return {
    ...actual,
    mapUserMediaToVideoItem: (...args: unknown[]) =>
      (mockMapUserMediaToVideoItem as (...a: unknown[]) => unknown)(...args)
  };
});

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    error: jest.fn()
  })
}));

import {
  getListingCreateViewData,
  getListingCreateViewDataForCurrentUser
} from "@web/src/server/actions/listings/viewData";

describe("listings viewData", () => {
  const savedContentRowsRef: { id: string }[] = [];
  const cachedAllForCreateRef = [{ orderedClipIds: ["user-media:media-1"] }];

  beforeEach(() => {
    jest.clearAllMocks();
    savedContentRowsRef.length = 0;
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue({ id: "listing-1" });
    mockGetListingClipVersionItems.mockResolvedValue([
      {
        currentVersion: {
          clipVersionId: "clip-version-1",
          videoUrl: "https://video-1",
          thumbnail: "https://thumb-1"
        }
      }
    ]);
    mockGetListingImages.mockResolvedValue([{ id: "img-1" }]);
    mockMapListingImageToDisplayItem.mockReturnValue({ id: "mapped-img-1" });
    mockGetListingContentItems.mockResolvedValue({
      items: [{ id: "content-1" }],
      hasMore: false,
      nextOffset: 1
    });
    mockGetContentByListingId.mockResolvedValue(savedContentRowsRef);
    mockGetAllCachedListingContentForCreate.mockResolvedValue(
      cachedAllForCreateRef
    );
    mockGetUserMediaByIds.mockResolvedValue([{ id: "media-1", type: "video" }]);
    mockCountUserMediaVideos.mockResolvedValue(2);
    mockMapUserMediaToVideoItem.mockReturnValue({
      id: "user-media:media-1",
      videoUrl: "https://user-media/video-1"
    });
  });

  it("assembles listing create view data from clips, items, images, and user media", async () => {
    const result = await getListingCreateViewData("user-1", "listing-1");

    expect(mockGetListingClipVersionItems).toHaveBeenCalledWith("listing-1");
    expect(mockGetContentByListingId).toHaveBeenCalledWith("user-1", "listing-1");
    expect(mockGetAllCachedListingContentForCreate).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1"
    });
    expect(mockGetUserMediaByIds).toHaveBeenCalledWith("user-1", ["media-1"]);
    expect(mockGetListingContentItems).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1",
      mediaTab: undefined,
      subcategory: undefined,
      limit: 8,
      offset: 0,
      savedContentRows: savedContentRowsRef,
      allCachedListingContentForCreate: cachedAllForCreateRef
    });
    expect(result).toEqual({
      listingClipItems: [
        expect.objectContaining({ clipVersionId: "clip-version-1" }),
        expect.objectContaining({ id: "user-media:media-1" })
      ],
      clipVersionItems: [
        expect.objectContaining({
          currentVersion: expect.objectContaining({ clipVersionId: "clip-version-1" })
        })
      ],
      listingContentItems: [{ id: "content-1" }],
      listingImages: [{ id: "mapped-img-1" }],
      userMediaVideoCount: 2
    });
  });

  it("enforces auth/listing access before loading current-user view data", async () => {
    await getListingCreateViewDataForCurrentUser("listing-1");

    expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
    expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
    expect(mockGetListingClipVersionItems).toHaveBeenCalledWith("listing-1");
  });
});
