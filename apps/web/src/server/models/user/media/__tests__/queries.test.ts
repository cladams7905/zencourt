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
  userMedia: {
    id: "id",
    userId: "userId",
    uploadedAt: "uploadedAt",
    type: "type"
  },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args,
  lt: (...args: unknown[]) => args,
  or: (...args: unknown[]) => args,
  sql: Object.assign(
    jest.fn(() => ({
      mapWith: () => ({})
    })),
    { raw: jest.fn() }
  )
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) =>
    (mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args)
}));

import {
  countUserMediaVideos,
  decodeUserMediaVideoPageCursor,
  encodeUserMediaVideoPageCursor,
  getUserMedia,
  getUserMediaById,
  getUserMediaByIds,
  getUserMediaVideoPage
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

  describe("user media video page cursor", () => {
    it("round-trips upload time and id through base64url payload", () => {
      const uploadedAt = new Date("2024-06-01T12:00:00.000Z");
      const cursor = encodeUserMediaVideoPageCursor({
        uploadedAt,
        id: "media-99"
      });
      expect(decodeUserMediaVideoPageCursor(cursor)).toEqual({
        uploadedAtIso: uploadedAt.toISOString(),
        id: "media-99"
      });
    });

    it("returns null for invalid cursor strings", () => {
      expect(decodeUserMediaVideoPageCursor("not-valid-base64!!!")).toBeNull();
      expect(decodeUserMediaVideoPageCursor("")).toBeNull();
    });
  });

  describe("countUserMediaVideos", () => {
    it("returns aggregate count for the user’s video rows", async () => {
      mockSelect.mockImplementationOnce((arg: unknown) => {
        if (arg && typeof arg === "object" && arg !== null && "n" in arg) {
          return {
            from: () => ({
              where: () => Promise.resolve([{ n: 7 }])
            })
          };
        }
        return { from: mockFrom };
      });

      await expect(countUserMediaVideos("u1")).resolves.toBe(7);
    });
  });

  describe("getUserMediaVideoPage", () => {
    const sampleRow = {
      id: "m1",
      userId: "u1",
      type: "video",
      url: "https://v",
      uploadedAt: new Date("2024-01-01T00:00:00.000Z")
    };

    it("returns an empty page when cursor cannot be decoded", async () => {
      await expect(
        getUserMediaVideoPage("u1", {
          limit: 10,
          cursor: "not-valid-base64!!!"
        })
      ).resolves.toEqual({
        items: [],
        nextCursor: null,
        hasMore: false
      });
    });

    it("returns rows, next cursor, and hasMore when more than limit exist", async () => {
      const mockLimit = jest.fn().mockResolvedValueOnce([
        sampleRow,
        { ...sampleRow, id: "m2", uploadedAt: new Date("2023-12-01T00:00:00.000Z") },
        { ...sampleRow, id: "m3", uploadedAt: new Date("2023-11-01T00:00:00.000Z") }
      ]);
      const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
      const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
      const mockFromLocal = jest.fn(() => ({ where: mockWhere }));
      mockSelect.mockImplementationOnce(() => ({ from: mockFromLocal }));

      const result = await getUserMediaVideoPage("u1", { limit: 2, cursor: null });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeTruthy();
      const secondRowDate = new Date("2023-12-01T00:00:00.000Z");
      expect(decodeUserMediaVideoPageCursor(result.nextCursor!)).toEqual({
        uploadedAtIso: secondRowDate.toISOString(),
        id: "m2"
      });
    });
  });
});
