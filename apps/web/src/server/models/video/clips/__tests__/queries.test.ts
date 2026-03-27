const mockLimit = jest.fn();
const mockOrderBy = jest.fn();
const mockWhere = jest.fn();
const mockInnerJoin = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) =>
      (mockSelect as (...a: unknown[]) => unknown)(...args)
  },
  videoClips: {
    id: "id",
    listingId: "listingId",
    currentVideoClipVersionId: "currentVideoClipVersionId",
    sortOrder: "sortOrder",
    createdAt: "createdAt"
  },
  videoClipVersions: {
    id: "id",
    videoClipId: "videoClipId",
    status: "status",
    versionNumber: "versionNumber",
    createdAt: "createdAt",
    sourceVideoGenJobId: "sourceVideoGenJobId"
  },
  and: (...args: unknown[]) => args,
  asc: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args
}));

jest.mock("../../../shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) =>
    (mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args)
}));

import {
  getCurrentVideoClipVersionsByListingId,
  getLatestVideoClipVersionByClipId,
  getSuccessfulVideoClipVersionsByClipId,
  getSuccessfulVideoClipVersionsByClipIds
} from "@web/src/server/models/video/clips/queries";

describe("video clip query models", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockWithDbErrorHandling.mockImplementation(
      async (fn: () => Promise<unknown>) => await fn()
    );
  });

  it("filters null current clip versions for a listing", async () => {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ innerJoin: mockInnerJoin });
    mockInnerJoin.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockResolvedValue([
      { clipVersion: { id: "cv-1" } },
      { clipVersion: null }
    ]);

    await expect(
      getCurrentVideoClipVersionsByListingId("listing-1")
    ).resolves.toEqual([{ id: "cv-1" }]);
  });

  it("returns successful versions for a single clip and grouped clip ids", async () => {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy
      .mockResolvedValueOnce([
        { id: "cv-2", videoClipId: "clip-1", versionNumber: 2 },
        { id: "cv-1", videoClipId: "clip-1", versionNumber: 1 }
      ])
      .mockResolvedValueOnce([
        { id: "cv-4", videoClipId: "clip-1", versionNumber: 4 },
        null,
        { id: "cv-3", videoClipId: "clip-2", versionNumber: 3 }
      ]);

    await expect(
      getSuccessfulVideoClipVersionsByClipId("clip-1")
    ).resolves.toEqual([
      { id: "cv-2", videoClipId: "clip-1", versionNumber: 2 },
      { id: "cv-1", videoClipId: "clip-1", versionNumber: 1 }
    ]);

    await expect(
      getSuccessfulVideoClipVersionsByClipIds([" clip-1 ", "", "clip-2"])
    ).resolves.toEqual(
      new Map([
        ["clip-1", [{ id: "cv-4", videoClipId: "clip-1", versionNumber: 4 }]],
        ["clip-2", [{ id: "cv-3", videoClipId: "clip-2", versionNumber: 3 }]]
      ])
    );
  });

  it("short-circuits successful versions by clip ids when none remain after trimming", async () => {
    await expect(
      getSuccessfulVideoClipVersionsByClipIds(["", "   "])
    ).resolves.toEqual(new Map());
    expect(mockWithDbErrorHandling).not.toHaveBeenCalled();
  });

  it("returns the latest version for a clip or null", async () => {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit
      .mockResolvedValueOnce([{ id: "latest-cv" }])
      .mockResolvedValueOnce([]);

    await expect(getLatestVideoClipVersionByClipId("clip-1")).resolves.toEqual({
      id: "latest-cv"
    });
    await expect(getLatestVideoClipVersionByClipId("clip-2")).resolves.toBeNull();
  });

  it("validates required ids on clip query helpers", async () => {
    await expect(
      getCurrentVideoClipVersionsByListingId("")
    ).rejects.toThrow("listingId is required");
    await expect(getSuccessfulVideoClipVersionsByClipId("")).rejects.toThrow(
      "clipId is required"
    );
    await expect(getLatestVideoClipVersionByClipId("")).rejects.toThrow(
      "clipId is required"
    );
  });
});
