const mockLimit = jest.fn();
const mockOrderBy = jest.fn();
const mockWhere = jest.fn();
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) =>
      (mockSelect as (...a: unknown[]) => unknown)(...args)
  },
  videoGenJobs: { id: "id" },
  videoGenBatch: { id: "id", listingId: "listingId", createdAt: "createdAt" },
  desc: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args
}));

jest.mock("../../../shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) =>
    (mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args)
}));

import {
  getLatestVideoGenBatchByListingId,
  getVideoGenBatchById,
  getVideoGenJobById
} from "@web/src/server/models/video";

describe("videoGen queries", () => {
  beforeEach(() => {
    mockLimit.mockReset();
    mockWhere.mockReset();
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockOrderBy.mockReset();
    mockWithDbErrorHandling.mockClear();
  });

  it("throws when jobId is empty", async () => {
    await expect(getVideoGenJobById("")).rejects.toThrow("jobId is required");
    await expect(getVideoGenJobById("   ")).rejects.toThrow("jobId is required");
  });

  it("returns job when found", async () => {
    const job = { id: "job-1", status: "pending", listingId: "listing-1" };
    mockWhere.mockImplementationOnce(() => ({ limit: mockLimit }));
    mockLimit.mockResolvedValueOnce([job]);

    const result = await getVideoGenJobById("job-1");
    expect(result).toEqual(job);
    expect(mockWithDbErrorHandling).toHaveBeenCalledWith(
      expect.any(Function),
      {
        actionName: "getVideoGenJobById",
        context: { jobId: "job-1" },
        errorMessage: "Failed to load video generation job. Please try again."
      }
    );
  });

  it("returns null when job not found", async () => {
    mockWhere.mockImplementationOnce(() => ({ limit: mockLimit }));
    mockLimit.mockResolvedValueOnce([]);

    const result = await getVideoGenJobById("missing-job");
    expect(result).toBeNull();
  });

  it("loads a batch by id and the latest batch by listing id", async () => {
    mockWhere
      .mockImplementationOnce(() => ({ limit: mockLimit }))
      .mockImplementationOnce(() => ({ orderBy: mockOrderBy }));
    mockLimit.mockResolvedValueOnce([{ id: "batch-1" }]);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValueOnce([{ id: "batch-2" }]);

    await expect(getVideoGenBatchById("batch-1")).resolves.toEqual({
      id: "batch-1"
    });
    await expect(
      getLatestVideoGenBatchByListingId("listing-1")
    ).resolves.toEqual({ id: "batch-2" });
  });

  it("returns null or validation errors for missing batch inputs", async () => {
    mockWhere
      .mockImplementationOnce(() => ({ limit: mockLimit }))
      .mockImplementationOnce(() => ({ orderBy: mockOrderBy }));
    mockLimit.mockResolvedValueOnce([]);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValueOnce([]);

    await expect(getVideoGenBatchById("batch-missing")).resolves.toBeNull();
    await expect(
      getLatestVideoGenBatchByListingId("listing-missing")
    ).resolves.toBeNull();
    await expect(getVideoGenBatchById("")).rejects.toThrow(
      "batchId is required"
    );
    await expect(getLatestVideoGenBatchByListingId("")).rejects.toThrow(
      "listingId is required"
    );
  });
});
