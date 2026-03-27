const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockInnerJoin = jest.fn();
const mockLeftJoin = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockUpdateWhere = jest.fn();
const mockReturning = jest.fn();
const mockInsert = jest.fn();
const mockValues = jest.fn();
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) =>
      (mockSelect as (...a: unknown[]) => unknown)(...args),
    update: (...args: unknown[]) =>
      (mockUpdate as (...a: unknown[]) => unknown)(...args),
    insert: (...args: unknown[]) =>
      (mockInsert as (...a: unknown[]) => unknown)(...args)
  },
  videoClips: {
    id: "id",
    listingId: "listingId",
    roomId: "roomId",
    roomName: "roomName",
    category: "category",
    clipIndex: "clipIndex",
    sortOrder: "sortOrder",
    currentVideoClipVersionId: "currentVideoClipVersionId",
    createdAt: "createdAt"
  },
  videoClipVersions: {
    id: "id",
    videoClipId: "videoClipId",
    versionNumber: "versionNumber",
    status: "status",
    createdAt: "createdAt",
    sourceVideoGenJobId: "sourceVideoGenJobId"
  },
  and: (...args: unknown[]) => args,
  asc: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) =>
    (mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args)
}));

import {
  createVideoClip,
  createVideoClipVersion,
  getCurrentVideoClipsWithCurrentVersionsByListingId,
  getVideoClipById,
  getVideoClipVersionById,
  getVideoClipVersionBySourceVideoGenJobId,
  getSuccessfulVideoClipVersionsByClipIds,
  updateVideoClip
} from "@web/src/server/models/video";

describe("video clip models", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockFrom.mockReset();
    mockInnerJoin.mockReset();
    mockLeftJoin.mockReset();
    mockWhere.mockReset();
    mockOrderBy.mockReset();
    mockLimit.mockReset();
    mockUpdate.mockReset();
    mockSet.mockReset();
    mockUpdateWhere.mockReset();
    mockReturning.mockReset();
    mockInsert.mockReset();
    mockValues.mockReset();
    mockWithDbErrorHandling.mockClear();
  });

  it("creates video clip rows", async () => {
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue(undefined);

    await createVideoClip({ id: "clip-1" } as never);

    expect(mockValues).toHaveBeenCalledWith({ id: "clip-1" });
  });

  it("creates video clip version rows", async () => {
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue(undefined);

    await createVideoClipVersion({ id: "clip-version-1" } as never);

    expect(mockValues).toHaveBeenCalledWith({ id: "clip-version-1" });
  });

  it("loads current video clips with current versions for a listing", async () => {
    const rows = [
      {
        clip: { id: "clip-1", roomName: "Kitchen" },
        clipVersion: { id: "clip-version-1", versionNumber: 1 }
      }
    ];
    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ innerJoin: mockInnerJoin });
    mockInnerJoin.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ orderBy: mockOrderBy });
    mockOrderBy.mockResolvedValueOnce(rows);

    await expect(
      getCurrentVideoClipsWithCurrentVersionsByListingId("listing-1")
    ).resolves.toEqual(rows);
  });

  it("loads successful versions for multiple clips in descending version order", async () => {
    const rows = [
      { id: "clip-v2", videoClipId: "clip-1", versionNumber: 2 },
      { id: "clip-v1", videoClipId: "clip-2", versionNumber: 1 }
    ];
    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ orderBy: mockOrderBy });
    mockOrderBy.mockResolvedValueOnce(rows);

    await expect(
      getSuccessfulVideoClipVersionsByClipIds(["clip-1", "clip-2"])
    ).resolves.toEqual(
      new Map([
        ["clip-1", [{ id: "clip-v2", videoClipId: "clip-1", versionNumber: 2 }]],
        ["clip-2", [{ id: "clip-v1", videoClipId: "clip-2", versionNumber: 1 }]]
      ])
    );
  });

  it("loads a video clip by id", async () => {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([{ id: "clip-1" }]);

    await expect(getVideoClipById("clip-1")).resolves.toEqual({
      id: "clip-1"
    });
  });

  it("loads a video clip version by id", async () => {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([{ id: "clip-v1" }]);

    await expect(getVideoClipVersionById("clip-v1")).resolves.toEqual({
      id: "clip-v1"
    });
  });

  it("loads a version by source job id", async () => {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([{ id: "clip-v2" }]);

    await expect(
      getVideoClipVersionBySourceVideoGenJobId("job-1")
    ).resolves.toEqual({
      id: "clip-v2"
    });
  });

  it("updates a clip current version pointer", async () => {
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockReturnValueOnce({ returning: mockReturning });
    mockReturning.mockResolvedValueOnce([
      { id: "clip-1", currentVideoClipVersionId: "clip-v2" }
    ]);

    await expect(
      updateVideoClip("clip-1", {
        currentVideoClipVersionId: "clip-v2"
      })
    ).resolves.toEqual([{ id: "clip-1", currentVideoClipVersionId: "clip-v2" }]);
  });
});
