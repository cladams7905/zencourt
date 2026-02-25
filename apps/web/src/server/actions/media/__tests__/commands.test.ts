const mockCreateUserMediaRecords = jest.fn();
const mockDeleteUserMedia = jest.fn();
const mockGetUserMediaById = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockPrepareUserMediaUploadUrls = jest.fn();
const mockMapUserMediaRecordInputs = jest.fn((_: string, uploads: unknown[]) => uploads);
const mockDeleteStorageUrlsOrThrow = jest.fn();
const mockIsManagedStorageUrl = jest.fn(() => true);

jest.mock("@web/src/server/models/userMedia", () => ({
  createUserMediaRecords: (...args: unknown[]) =>
    (mockCreateUserMediaRecords as (...a: unknown[]) => unknown)(...args),
  getUserMediaById: (...args: unknown[]) =>
    (mockGetUserMediaById as (...a: unknown[]) => unknown)(...args),
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
  isManagedStorageUrl: (...args: unknown[]) =>
    (mockIsManagedStorageUrl as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

import {
  getUserMediaUploadUrlsForCurrentUser,
  createUserMediaRecordsForCurrentUser,
  deleteUserMediaForCurrentUser
} from "@web/src/server/actions/media/commands";

describe("media commands", () => {
  const mockUser = { id: "user-1" } as never;

  beforeEach(() => {
    mockCreateUserMediaRecords.mockReset();
    mockDeleteUserMedia.mockReset();
    mockGetUserMediaById.mockReset();
    mockPrepareUserMediaUploadUrls.mockReset();
    mockMapUserMediaRecordInputs.mockClear();
    mockDeleteStorageUrlsOrThrow.mockReset();
    mockIsManagedStorageUrl.mockReset();
    mockIsManagedStorageUrl.mockReturnValue(true);
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
});
