const mockCreateUserMediaRecords = jest.fn();
const mockDeleteUserMedia = jest.fn();
const mockGetUserMediaById = jest.fn();
const mockGetUserMedia = jest.fn();
const mockGetUserMediaVideoPage = jest.fn();
const mockCountUserMediaVideos = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockPrepareUserMediaUploadUrls = jest.fn();
const mockMapUserMediaRecordInputs = jest.fn((_: string, uploads: unknown[]) => uploads);
const mockDeleteStorageUrlsOrThrow = jest.fn();
const mockIsManagedStorageUrl = jest.fn(() => true);
const mockGetPublicDownloadUrlSafe = jest.fn((url: string | null | undefined) => url);

jest.mock("@web/src/server/models/user", () => ({
  createUserMediaRecords: (...args: unknown[]) =>
    (mockCreateUserMediaRecords as (...a: unknown[]) => unknown)(...args),
  getUserMediaById: (...args: unknown[]) =>
    (mockGetUserMediaById as (...a: unknown[]) => unknown)(...args),
  getUserMedia: (...args: unknown[]) =>
    (mockGetUserMedia as (...a: unknown[]) => unknown)(...args),
  getUserMediaVideoPage: (...args: unknown[]) =>
    (mockGetUserMediaVideoPage as (...a: unknown[]) => unknown)(...args),
  countUserMediaVideos: (...args: unknown[]) =>
    (mockCountUserMediaVideos as (...a: unknown[]) => unknown)(...args),
  deleteUserMedia: (...args: unknown[]) =>
    (mockDeleteUserMedia as (...a: unknown[]) => unknown)(...args)
}));
jest.mock("@web/src/server/services/storage/uploadPreparation", () => ({
  prepareUserMediaUploadUrls: (...args: unknown[]) =>
    (mockPrepareUserMediaUploadUrls as (...a: unknown[]) => unknown)(...args),
  mapUserMediaRecordInputs: (...args: unknown[]) =>
    (mockMapUserMediaRecordInputs as (...a: unknown[]) => unknown)(...args)
}));
jest.mock("@web/src/server/actions/shared/storageCleanup", () => ({
  deleteStorageUrlsOrThrow: (...args: unknown[]) =>
    (mockDeleteStorageUrlsOrThrow as (...a: unknown[]) => unknown)(...args)
}));
jest.mock("@web/src/server/services/storage/urlResolution", () => ({
  getPublicDownloadUrlSafe: (...args: unknown[]) =>
    (mockGetPublicDownloadUrlSafe as (...a: unknown[]) => unknown)(...args),
  isManagedStorageUrl: (...args: unknown[]) =>
    (mockIsManagedStorageUrl as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/shared/auth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args),
  withCurrentUser: async (run: (context: { user: { id: string } }) => unknown) =>
    run({ user: await mockRequireAuthenticatedUser() })
}));

import {
  getUserMediaUploadUrlsForCurrentUser,
  createUserMediaRecordsForCurrentUser,
  deleteUserMediaForCurrentUser,
  getUserMediaForCurrentUser,
  getUserMediaPageForReelPicker,
  getUserMediaVideoCountForCurrentUser
} from "@web/src/server/actions/media/commands";

describe("media commands", () => {
  const mockUser = { id: "user-1" } as never;

  beforeEach(() => {
    mockCreateUserMediaRecords.mockReset();
    mockDeleteUserMedia.mockReset();
    mockGetUserMediaById.mockReset();
    mockGetUserMedia.mockReset();
    mockGetUserMediaVideoPage.mockReset();
    mockCountUserMediaVideos.mockReset();
    mockPrepareUserMediaUploadUrls.mockReset();
    mockMapUserMediaRecordInputs.mockClear();
    mockDeleteStorageUrlsOrThrow.mockReset();
    mockIsManagedStorageUrl.mockReset();
    mockGetPublicDownloadUrlSafe.mockReset();
    mockIsManagedStorageUrl.mockReturnValue(true);
    mockGetPublicDownloadUrlSafe.mockImplementation((url: string | null | undefined) => url);
    mockRequireAuthenticatedUser.mockReset();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
  });

  describe("getUserMediaUploadUrlsForCurrentUser", () => {
    it("delegates to prepareUserMediaUploadUrls with current user id", async () => {
      const files = [{ name: "a.jpg", type: "image/jpeg" }] as never[];
      mockPrepareUserMediaUploadUrls.mockResolvedValueOnce([{ url: "https://x" }]);

      const result = await getUserMediaUploadUrlsForCurrentUser(files);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockPrepareUserMediaUploadUrls).toHaveBeenCalledWith("user-1", files);
      expect(result).toEqual([{ url: "https://x" }]);
    });
  });

  describe("createUserMediaRecordsForCurrentUser", () => {
    it("delegates to createUserMediaRecords with current user id", async () => {
      const uploads = [{ key: "k1", name: "a.jpg" }] as never[];
      mockCreateUserMediaRecords.mockResolvedValueOnce([{ id: "m1" }]);

      const result = await createUserMediaRecordsForCurrentUser(uploads);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockMapUserMediaRecordInputs).toHaveBeenCalledWith("user-1", uploads);
      expect(mockCreateUserMediaRecords).toHaveBeenCalledWith("user-1", uploads);
      expect(result).toEqual([{ id: "m1" }]);
    });
  });

  describe("deleteUserMediaForCurrentUser", () => {
    it("deletes db record then storage URLs", async () => {
      mockGetUserMediaById.mockResolvedValueOnce({
        url: "https://managed.com/a.jpg",
        thumbnailUrl: "https://external.com/t.jpg"
      });
      mockDeleteUserMedia.mockResolvedValueOnce(undefined);

      await deleteUserMediaForCurrentUser("media-1");

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockGetUserMediaById).toHaveBeenCalledWith("user-1", "media-1");
      expect(mockDeleteUserMedia).toHaveBeenCalledWith("user-1", "media-1");
      expect(mockDeleteStorageUrlsOrThrow).toHaveBeenCalledWith(
        ["https://managed.com/a.jpg", "https://external.com/t.jpg"],
        "Failed to delete media file"
      );
    });

    it("does not attempt storage delete when media is missing", async () => {
      mockGetUserMediaById.mockResolvedValueOnce(null);
      mockDeleteUserMedia.mockResolvedValueOnce(undefined);

      await deleteUserMediaForCurrentUser("media-2");

      expect(mockDeleteUserMedia).toHaveBeenCalledWith("user-1", "media-2");
      expect(mockDeleteStorageUrlsOrThrow).not.toHaveBeenCalled();
    });

    it("filters out unmanaged urls before storage cleanup", async () => {
      mockGetUserMediaById.mockResolvedValueOnce({
        url: "https://managed.com/a.jpg",
        thumbnailUrl: "https://external.com/t.jpg"
      });
      mockDeleteUserMedia.mockResolvedValueOnce(undefined);
      mockIsManagedStorageUrl
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      await deleteUserMediaForCurrentUser("media-3");

      expect(mockDeleteStorageUrlsOrThrow).toHaveBeenCalledWith(
        ["https://managed.com/a.jpg"],
        "Failed to delete media file"
      );
    });
  });

  describe("getUserMediaPageForReelPicker", () => {
    it("maps video rows to content items with pagination metadata", async () => {
      mockGetUserMediaVideoPage.mockResolvedValueOnce({
        items: [
          {
            id: "m1",
            userId: "user-1",
            type: "video",
            url: "private://v",
            thumbnailUrl: "private://t",
            durationSeconds: 3,
            usageCount: 0,
            uploadedAt: new Date("2024-01-01T00:00:00.000Z")
          }
        ],
        nextCursor: "cursor-1",
        hasMore: true
      });
      mockGetPublicDownloadUrlSafe
        .mockReturnValueOnce("https://public/v")
        .mockReturnValueOnce("https://public/t");

      const result = await getUserMediaPageForReelPicker({
        limit: 6,
        cursor: null
      });

      expect(mockGetUserMediaVideoPage).toHaveBeenCalledWith("user-1", {
        limit: 6,
        cursor: null
      });
      expect(result.items).toEqual([
        expect.objectContaining({
          id: "user-media:m1",
          videoUrl: "https://public/v",
          reelClipSource: "user_media"
        })
      ]);
      expect(result.nextCursor).toBe("cursor-1");
      expect(result.hasMore).toBe(true);
    });
  });

  describe("getUserMediaVideoCountForCurrentUser", () => {
    it("returns the video count for the current user", async () => {
      mockCountUserMediaVideos.mockResolvedValueOnce(4);

      const result = await getUserMediaVideoCountForCurrentUser();

      expect(mockCountUserMediaVideos).toHaveBeenCalledWith("user-1");
      expect(result).toBe(4);
    });
  });

  describe("getUserMediaForCurrentUser", () => {
    it("returns media with resolved public urls", async () => {
      mockGetUserMedia.mockResolvedValueOnce([
        {
          id: "m1",
          url: "private://media-1",
          thumbnailUrl: "private://thumb-1",
          durationSeconds: 4.25
        }
      ]);
      mockGetPublicDownloadUrlSafe
        .mockReturnValueOnce("https://public/media-1")
        .mockReturnValueOnce("https://public/thumb-1");

      const result = await getUserMediaForCurrentUser();

      expect(mockGetUserMedia).toHaveBeenCalledWith("user-1");
      expect(result).toEqual([
        expect.objectContaining({
          id: "m1",
          url: "https://public/media-1",
          thumbnailUrl: "https://public/thumb-1",
          durationSeconds: 4.25
        })
      ]);
    });
  });
});
