const mockLimit = jest.fn();
const mockSelectWhere = jest.fn(() => ({ limit: mockLimit }));
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockDeleteWhere = jest.fn();
const mockDelete = jest.fn(() => ({ where: mockDeleteWhere }));

const mockDeleteStorageUrlsOrThrow = jest.fn();
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    delete: (...args: unknown[]) => mockDelete(...args)
  },
  userMedia: { id: "id", userId: "userId" },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/actions/shared/storageCleanup", () => ({
  deleteStorageUrlsOrThrow: (...args: unknown[]) => mockDeleteStorageUrlsOrThrow(...args)
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => mockWithDbErrorHandling(...args)
}));

import { deleteUserMedia } from "@web/src/server/actions/db/userMedia/mutations";

describe("userMedia mutations", () => {
  beforeEach(() => {
    mockLimit.mockReset();
    mockSelectWhere.mockClear();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
    mockDeleteWhere.mockReset();
    mockDelete.mockClear();
    mockDeleteStorageUrlsOrThrow.mockReset();
    mockWithDbErrorHandling.mockClear();
  });

  it("validates required params", async () => {
    await expect(deleteUserMedia("", "m1")).rejects.toThrow(
      "User ID is required to delete media"
    );
    await expect(deleteUserMedia("u1", "")).rejects.toThrow(
      "Media ID is required to delete media"
    );
  });

  it("throws when media record is missing", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await expect(deleteUserMedia("u1", "m1")).rejects.toThrow("Media not found");
  });

  it("deletes storage files and db row", async () => {
    mockLimit.mockResolvedValueOnce([
      { id: "m1", url: "https://x", thumbnailUrl: "https://thumb" }
    ]);
    mockDeleteWhere.mockResolvedValueOnce(undefined);

    await expect(deleteUserMedia("u1", "m1")).resolves.toBeUndefined();

    expect(mockDeleteStorageUrlsOrThrow).toHaveBeenCalledWith(
      ["https://x", "https://thumb"],
      "Failed to delete media file"
    );
    expect(mockDelete).toHaveBeenCalled();
  });
});
