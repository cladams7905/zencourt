const mockLimit = jest.fn();
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
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
  eq: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) =>
    (mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args)
}));

import { getVideoGenJobById } from "@web/src/server/models/videoGen/queries";

describe("videoGen queries", () => {
  beforeEach(() => {
    mockLimit.mockReset();
    mockWhere.mockReset();
    mockFrom.mockClear();
    mockSelect.mockClear();
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
});
