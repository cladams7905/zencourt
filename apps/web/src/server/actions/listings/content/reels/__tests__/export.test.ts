/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetCurrentVideoClipsWithCurrentVersionsByListingId = jest.fn();
const mockGetUserMediaByIds = jest.fn();

jest.mock("@web/src/server/actions/shared/auth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args),
  withCurrentUserListingAccess: async (
    listingIdOrResolver:
      | string
      | ((context: { user: { id: string } }) => string | Promise<string>),
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

jest.mock("@web/src/server/models/video", () => ({
  getCurrentVideoClipsWithCurrentVersionsByListingId: (...args: unknown[]) =>
    (mockGetCurrentVideoClipsWithCurrentVersionsByListingId as (
      ...a: unknown[]
    ) => unknown)(...args)
}));

jest.mock("@web/src/server/models/user/media", () => ({
  getUserMediaByIds: (...args: unknown[]) =>
    (mockGetUserMediaByIds as (...a: unknown[]) => unknown)(...args)
}));

import { buildListingReelExportRequestForCurrentUser } from "@web/src/server/actions/listings/content/reels/export";

describe("buildListingReelExportRequestForCurrentUser", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue({ id: "listing-1" });
  });

  it("builds a render request from listing clips and user media", async () => {
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId.mockResolvedValue([
      {
        clip: { id: "clip-1", listingId: "listing-1" },
        clipVersion: { id: "clip-version-1", videoUrl: "https://cdn.example.com/clip-1.mp4" }
      }
    ]);
    mockGetUserMediaByIds.mockResolvedValue([
      {
        id: "media-1",
        userId: "user-1",
        url: "https://cdn.example.com/media-1.mp4"
      }
    ]);

    const result = await buildListingReelExportRequestForCurrentUser("listing-1", {
      filenameBase: "reel-preview-1",
      segments: [
        {
          sourceType: "listing_clip",
          sourceId: "clip-1",
          durationSeconds: 2.5,
          textOverlay: { text: "Hook", position: "center", background: "black", font: "sans-modern", templatePattern: "simple", lines: [{ text: "Hook", fontRole: "body" }], fontPairing: "contemporary-script" },
          supplementalAddressOverlay: null
        },
        {
          sourceType: "user_media",
          sourceId: "media-1",
          durationSeconds: 3,
          textOverlay: null,
          supplementalAddressOverlay: null
        }
      ]
    });

    expect(mockGetCurrentVideoClipsWithCurrentVersionsByListingId).toHaveBeenCalledWith(
      "listing-1"
    );
    expect(mockGetUserMediaByIds).toHaveBeenCalledWith("user-1", ["media-1"]);
    expect(result).toEqual({
      filename: "reel-preview-1.mp4",
      request: {
        exportId: expect.any(String),
        orientation: "vertical",
        clips: [
          expect.objectContaining({
            src: "https://cdn.example.com/clip-1.mp4",
            durationSeconds: 2.5
          }),
          expect.objectContaining({
            src: "https://cdn.example.com/media-1.mp4",
            durationSeconds: 3
          })
        ]
      }
    });
  });

  it("throws when a referenced source cannot be resolved", async () => {
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId.mockResolvedValue([]);
    mockGetUserMediaByIds.mockResolvedValue([]);

    await expect(
      buildListingReelExportRequestForCurrentUser("listing-1", {
        filenameBase: "reel-preview-1",
        segments: [
          {
            sourceType: "listing_clip",
            sourceId: "missing-clip",
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      })
    ).rejects.toThrow("Reel draft source not found");
  });
});
