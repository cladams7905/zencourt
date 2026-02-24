const mockGetUserMediaUploadUrls = jest.fn();
const mockCreateUserMediaRecords = jest.fn();
const mockDeleteUserMedia = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();

jest.mock("@web/src/server/models/userMedia", () => ({
  getUserMediaUploadUrls: (...args: unknown[]) =>
    (mockGetUserMediaUploadUrls as (...a: unknown[]) => unknown)(...args),
  createUserMediaRecords: (...args: unknown[]) =>
    (mockCreateUserMediaRecords as (...a: unknown[]) => unknown)(...args),
  deleteUserMedia: (...args: unknown[]) =>
    (mockDeleteUserMedia as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/utils/apiAuth", () => ({
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
    mockGetUserMediaUploadUrls.mockReset();
    mockCreateUserMediaRecords.mockReset();
    mockDeleteUserMedia.mockReset();
    mockRequireAuthenticatedUser.mockReset();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
  });

  describe("getUserMediaUploadUrlsForCurrentUser", () => {
    it("delegates to getUserMediaUploadUrls with current user id", async () => {
      const files = [{ name: "a.jpg", type: "image/jpeg" }] as never[];
      mockGetUserMediaUploadUrls.mockResolvedValueOnce([{ url: "https://x" }]);

      const result = await getUserMediaUploadUrlsForCurrentUser(files);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockGetUserMediaUploadUrls).toHaveBeenCalledWith("user-1", files);
      expect(result).toEqual([{ url: "https://x" }]);
    });
  });

  describe("createUserMediaRecordsForCurrentUser", () => {
    it("delegates to createUserMediaRecords with current user id", async () => {
      const uploads = [{ key: "k1", name: "a.jpg" }] as never[];
      mockCreateUserMediaRecords.mockResolvedValueOnce([{ id: "m1" }]);

      const result = await createUserMediaRecordsForCurrentUser(uploads);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockCreateUserMediaRecords).toHaveBeenCalledWith("user-1", uploads);
      expect(result).toEqual([{ id: "m1" }]);
    });
  });

  describe("deleteUserMediaForCurrentUser", () => {
    it("delegates to deleteUserMedia with current user id", async () => {
      mockDeleteUserMedia.mockResolvedValueOnce(undefined);

      await deleteUserMediaForCurrentUser("media-1");

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockDeleteUserMedia).toHaveBeenCalledWith("user-1", "media-1");
    });
  });
});
