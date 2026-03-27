/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetListingClipVersionItems = jest.fn();
const mockGetListingClipDownload = jest.fn();

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/listings/clips/queries", () => ({
  getListingClipVersionItems: (...args: unknown[]) =>
    (mockGetListingClipVersionItems as (...a: unknown[]) => unknown)(...args),
  getListingClipDownload: (...args: unknown[]) =>
    (mockGetListingClipDownload as (...a: unknown[]) => unknown)(...args)
}));

import {
  getListingClipDownloadForCurrentUser,
  getListingClipVersionItemsForCurrentUser
} from "@web/src/server/actions/listings/clips/actions";

describe("clips actions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue(undefined);
  });

  it("guards and delegates getListingClipVersionItemsForCurrentUser", async () => {
    mockGetListingClipVersionItems.mockResolvedValueOnce([{ clipId: "clip-1" }]);

    const result = await getListingClipVersionItemsForCurrentUser("listing-1");

    expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
    expect(mockGetListingClipVersionItems).toHaveBeenCalledWith("listing-1");
    expect(result).toEqual([{ clipId: "clip-1" }]);
  });

  it("guards and delegates getListingClipDownloadForCurrentUser", async () => {
    mockGetListingClipDownload.mockResolvedValueOnce({
      videoUrl: "https://cdn.example.com/clip.mp4",
      filename: "kitchen-v2.mp4"
    });

    const result = await getListingClipDownloadForCurrentUser(
      "listing-1",
      "clip-version-2"
    );

    expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
    expect(mockGetListingClipDownload).toHaveBeenCalledWith(
      "listing-1",
      "clip-version-2"
    );
    expect(result).toEqual({
      videoUrl: "https://cdn.example.com/clip.mp4",
      filename: "kitchen-v2.mp4"
    });
  });
});
