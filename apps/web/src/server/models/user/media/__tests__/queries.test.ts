const mockOrderBy = jest.fn();
const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockLimit = jest.fn();
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) =>
      (mockSelect as (...a: unknown[]) => unknown)(...args)
  },
  userMedia: { id: "id", userId: "userId", uploadedAt: "uploadedAt" },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) =>
    (mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args)
}));

import {
  getUserMedia,
  getUserMediaById,
  getUserMediaByIds
} from "@web/src/server/models/user/media/queries";

describe("userMedia queries", () => {
  beforeEach(() => {
    mockOrderBy.mockReset();
    mockLimit.mockReset();
    mockWhere.mockImplementation(() => ({
      orderBy: mockOrderBy,
      limit: mockLimit
    }));
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockWithDbErrorHandling.mockClear();
  });

  it("validates user id", async () => {
    await expect(getUserMedia(" ")).rejects.toThrow(
      "User ID is required to fetch media"
    );
  });

  it("returns user media ordered by upload date", async () => {
    mockOrderBy.mockResolvedValueOnce([{ id: "m1" }]);
    await expect(getUserMedia("u1")).resolves.toEqual([{ id: "m1" }]);
  });

  it("returns null when media id is missing or belongs to another user", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await expect(getUserMediaById("u1", "m1")).resolves.toBeNull();

    mockLimit.mockResolvedValueOnce([{ id: "m1", userId: "u2" }]);
    await expect(getUserMediaById("u1", "m1")).resolves.toBeNull();
  });

  it("returns media row when id belongs to user", async () => {
    const row = { id: "m1", userId: "u1" };
    mockLimit.mockResolvedValueOnce([row]);
    await expect(getUserMediaById("u1", "m1")).resolves.toEqual(row);
  });

  it("getUserMediaByIds returns empty array when no ids", async () => {
    await expect(getUserMediaByIds("u1", [])).resolves.toEqual([]);
    await expect(getUserMediaByIds("u1", ["", "  "])).resolves.toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("getUserMediaByIds dedupes and orders by query", async () => {
    mockOrderBy.mockResolvedValueOnce([{ id: "m2" }, { id: "m1" }]);
    await expect(
      getUserMediaByIds("u1", ["m1", "m1", "m2"])
    ).resolves.toEqual([{ id: "m2" }, { id: "m1" }]);
  });
});
