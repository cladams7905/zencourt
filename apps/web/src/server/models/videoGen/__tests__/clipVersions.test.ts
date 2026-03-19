const mockSelect = jest.fn();
const mockFrom = jest.fn();
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
  clipVersions: {
    id: "id",
    clipId: "clipId",
    listingId: "listingId",
    isCurrent: "isCurrent",
    roomName: "roomName",
    clipIndex: "clipIndex",
    versionNumber: "versionNumber",
    status: "status",
    createdAt: "createdAt",
    sortOrder: "sortOrder"
  },
  and: (...args: unknown[]) => args,
  asc: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) =>
    (mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args)
}));

import {
  createClipVersion,
  getClipVersionById,
  getCurrentClipVersionsByListingId,
  getSuccessfulClipVersionsByClipId,
  markClipVersionAsCurrent
} from "@web/src/server/models/videoGen";

describe("clipVersions model", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockFrom.mockReset();
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

  it("creates clip version rows", async () => {
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue(undefined);

    await createClipVersion({ id: "clip-version-1" } as never);

    expect(mockValues).toHaveBeenCalledWith({ id: "clip-version-1" });
  });

  it("loads current clip versions for a listing", async () => {
    const rows = [{ id: "clip-1", isCurrent: true }];
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockResolvedValue(rows);

    await expect(
      getCurrentClipVersionsByListingId("listing-1")
    ).resolves.toEqual(rows);
  });

  it("loads successful versions for a clip in descending version order", async () => {
    const rows = [{ id: "clip-v2", versionNumber: 2 }];
    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ limit: mockLimit });
    mockLimit.mockResolvedValueOnce([
      {
        id: "clip-1",
        clipId: "clip-1",
        listingId: "listing-1",
        roomName: "Kitchen",
        clipIndex: 0
      }
    ]);

    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ orderBy: mockOrderBy });
    mockOrderBy.mockResolvedValueOnce(rows);

    await expect(getSuccessfulClipVersionsByClipId("clip-1")).resolves.toEqual(
      rows
    );
  });

  it("loads a clip version by id", async () => {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([{ id: "clip-v1" }]);

    await expect(getClipVersionById("clip-v1")).resolves.toEqual({
      id: "clip-v1"
    });
  });

  it("promotes a version to current and clears prior current flag", async () => {
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);

    mockUpdate.mockReturnValueOnce({ set: mockSet });
    mockSet.mockReturnValueOnce({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValueOnce(undefined);

    mockUpdate.mockReturnValueOnce({ set: mockSet });
    mockSet.mockReturnValueOnce({ where: mockUpdateWhere });
    mockUpdateWhere.mockReturnValueOnce({ returning: mockReturning });
    mockReturning.mockResolvedValueOnce([{ id: "clip-v2", isCurrent: true }]);

    await expect(
      markClipVersionAsCurrent({
        clipVersionId: "clip-v2",
        listingId: "listing-1",
        clipId: "clip-1"
      })
    ).resolves.toEqual([{ id: "clip-v2", isCurrent: true }]);
  });
});
