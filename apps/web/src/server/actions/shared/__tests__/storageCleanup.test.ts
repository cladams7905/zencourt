const mockDeleteFile = jest.fn();

jest.mock("@web/src/server/services/storageService", () => ({
  __esModule: true,
  default: {
    deleteFile: (...args: unknown[]) => mockDeleteFile(...args)
  }
}));

import { deleteStorageUrlsOrThrow } from "@web/src/server/actions/shared/storageCleanup";

describe("storageCleanup", () => {
  beforeEach(() => {
    mockDeleteFile.mockReset();
  });

  it("deletes all provided URLs", async () => {
    mockDeleteFile.mockResolvedValue({ success: true });

    await deleteStorageUrlsOrThrow(["a", undefined, "b", null], "fallback");

    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    expect(mockDeleteFile).toHaveBeenNthCalledWith(1, "a");
    expect(mockDeleteFile).toHaveBeenNthCalledWith(2, "b");
  });

  it("throws service error when delete fails", async () => {
    mockDeleteFile.mockResolvedValue({ success: false, error: "cannot delete" });

    await expect(deleteStorageUrlsOrThrow(["a"], "fallback")).rejects.toThrow(
      "cannot delete"
    );
  });
});
