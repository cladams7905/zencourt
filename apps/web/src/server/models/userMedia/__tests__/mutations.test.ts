const mockLimit = jest.fn();
const mockSelectWhere = jest.fn(() => ({ limit: mockLimit }));
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockDeleteWhere = jest.fn();
const mockDelete = jest.fn(() => ({ where: mockDeleteWhere }));

const mockInsertOnConflictDoUpdate = jest.fn();
const mockInsertReturning = jest.fn();
const mockInsertValues = jest.fn(() => ({
  returning: mockInsertReturning,
  onConflictDoUpdate: mockInsertOnConflictDoUpdate
}));
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args)),
    delete: (...args: unknown[]) => ((mockDelete as (...a: unknown[]) => unknown)(...args)),
    insert: (...args: unknown[]) => ((mockInsert as (...a: unknown[]) => unknown)(...args))
  },
  userMedia: { id: "id", userId: "userId" },
  userAdditional: { userId: "userId" },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

import {
  createUserMediaRecords,
  deleteUserMedia
} from "@web/src/server/models/userMedia/mutations";

describe("userMedia mutations", () => {
  beforeEach(() => {
    mockLimit.mockReset();
    mockSelectWhere.mockClear();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
    mockDeleteWhere.mockReset();
    mockDelete.mockClear();
    mockInsertOnConflictDoUpdate.mockReset();
    mockInsertReturning.mockReset();
    mockInsertValues.mockClear();
    mockInsert.mockClear();
    mockWithDbErrorHandling.mockClear();
  });

  it("creates media records", async () => {
    const inserted = [{ id: "m1", userId: "u1", type: "image", url: "u", thumbnailUrl: null }];
    mockInsertReturning.mockResolvedValueOnce(inserted);
    mockInsertOnConflictDoUpdate.mockResolvedValueOnce(undefined);

    const result = await createUserMediaRecords("u1", [
      { type: "image", url: "https://x", thumbnailUrl: null }
    ]);

    expect(result).toEqual(inserted);
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

  it("deletes db row", async () => {
    mockLimit.mockResolvedValueOnce([
      { id: "m1", url: "https://x", thumbnailUrl: "https://thumb" }
    ]);
    mockDeleteWhere.mockResolvedValueOnce(undefined);

    await expect(deleteUserMedia("u1", "m1")).resolves.toBeUndefined();

    expect(mockDelete).toHaveBeenCalled();
  });
});
