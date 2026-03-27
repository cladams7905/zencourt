const mockValues = jest.fn();
const mockInsert = jest.fn();
const mockReturning = jest.fn();
const mockUpdateWhere = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    insert: (...args: unknown[]) =>
      (mockInsert as (...a: unknown[]) => unknown)(...args),
    update: (...args: unknown[]) =>
      (mockUpdate as (...a: unknown[]) => unknown)(...args)
  },
  videoClips: { id: "id" },
  videoClipVersions: { id: "id" },
  eq: (...args: unknown[]) => args
}));

jest.mock("../../../shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) =>
    (mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args)
}));

import {
  createVideoClip,
  createVideoClipVersion,
  updateVideoClipVersion
} from "@web/src/server/models/video/clips/mutations";

describe("video clip mutation models", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockWithDbErrorHandling.mockImplementation(
      async (fn: () => Promise<unknown>) => await fn()
    );
  });

  it("creates clip and clip version rows", async () => {
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue(undefined);

    await createVideoClip({ id: "clip-1", listingId: "listing-1" } as never);
    await createVideoClipVersion({
      id: "clip-version-1",
      videoClipId: "clip-1"
    } as never);

    expect(mockValues).toHaveBeenNthCalledWith(1, {
      id: "clip-1",
      listingId: "listing-1"
    });
    expect(mockValues).toHaveBeenNthCalledWith(2, {
      id: "clip-version-1",
      videoClipId: "clip-1"
    });
  });

  it("updates clip versions and stamps updatedAt", async () => {
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([
      { id: "clip-version-1", status: "completed" }
    ]);

    await expect(
      updateVideoClipVersion("clip-version-1", { status: "completed" } as never)
    ).resolves.toEqual({ id: "clip-version-1", status: "completed" });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        updatedAt: expect.any(Date)
      })
    );
  });

  it("throws when updating a missing clip version", async () => {
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([]);

    await expect(
      updateVideoClipVersion("missing-version", { status: "failed" } as never)
    ).rejects.toThrow("Clip version missing-version not found");
  });
});
