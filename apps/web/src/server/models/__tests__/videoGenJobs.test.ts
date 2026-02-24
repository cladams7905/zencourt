const mockValues = jest.fn();
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockReturning = jest.fn();
const mockWhere = jest.fn(() => ({ returning: mockReturning }));
const mockSet = jest.fn(() => ({ where: mockWhere }));
const mockUpdate = jest.fn(() => ({ set: mockSet }));
const mockLimit = jest.fn();
const mockSelectWhere = jest.fn(() => ({ limit: mockLimit }));
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

jest.mock("@db/client", () => ({
  db: {
    insert: (...args: unknown[]) => ((mockInsert as (...a: unknown[]) => unknown)(...args)),
    update: (...args: unknown[]) => ((mockUpdate as (...a: unknown[]) => unknown)(...args)),
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args))
  },
  videoGenJobs: { id: "id" },
  eq: (...args: unknown[]) => args
}));

import {
  createVideoGenJob,
  createVideoGenJobsBatch,
  getVideoGenJobById,
  updateVideoGenJob
} from "@web/src/server/models/videoGenJobs";

describe("videoGenJobs actions", () => {
  beforeEach(() => {
    mockValues.mockReset();
    mockInsert.mockClear();
    mockReturning.mockReset();
    mockWhere.mockClear();
    mockSet.mockClear();
    mockUpdate.mockClear();
    mockLimit.mockReset();
    mockSelectWhere.mockClear();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
  });

  it("creates job", async () => {
    mockValues.mockResolvedValue(undefined);
    await createVideoGenJob({ id: "j1" } as never);
    expect(mockValues).toHaveBeenCalledWith({ id: "j1" });
  });

  it("creates jobs in batch", async () => {
    mockValues.mockResolvedValue(undefined);
    await createVideoGenJobsBatch([{ id: "j1" }, { id: "j2" }] as never);
    expect(mockValues).toHaveBeenCalledWith([{ id: "j1" }, { id: "j2" }]);
  });

  it("updates and fetches job", async () => {
    mockReturning.mockResolvedValue([{ id: "j1" }]);
    await expect(updateVideoGenJob("j1", {})).resolves.toEqual({ id: "j1" });

    mockLimit.mockResolvedValue([{ id: "j1" }]);
    await expect(getVideoGenJobById("j1")).resolves.toEqual({ id: "j1" });
  });

  it("validates id and handles not found", async () => {
    await expect(updateVideoGenJob("", {})).rejects.toThrow("jobId is required");
    await expect(getVideoGenJobById(" ")).rejects.toThrow("jobId is required");

    mockReturning.mockResolvedValue([]);
    await expect(updateVideoGenJob("j1", {})).rejects.toThrow(
      "Video generation job j1 not found"
    );

    mockLimit.mockResolvedValue([]);
    await expect(getVideoGenJobById("j1")).resolves.toBeNull();
  });
});
