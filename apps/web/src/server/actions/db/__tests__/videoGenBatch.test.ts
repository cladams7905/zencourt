const mockValues = jest.fn();
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockReturning = jest.fn();
const mockWhere = jest.fn(() => ({ returning: mockReturning }));
const mockSet = jest.fn(() => ({ where: mockWhere }));
const mockUpdate = jest.fn(() => ({ set: mockSet }));

jest.mock("@db/client", () => ({
  db: {
    insert: (...args: unknown[]) => ((mockInsert as (...a: unknown[]) => unknown)(...args)),
    update: (...args: unknown[]) => ((mockUpdate as (...a: unknown[]) => unknown)(...args))
  },
  videoGenBatch: { id: "id" },
  eq: (...args: unknown[]) => args
}));

import {
  createVideoGenBatch,
  updateVideoGenBatch
} from "@web/src/server/actions/db/videoGenBatch";

describe("videoGenBatch actions", () => {
  beforeEach(() => {
    mockValues.mockReset();
    mockInsert.mockClear();
    mockReturning.mockReset();
    mockWhere.mockClear();
    mockSet.mockClear();
    mockUpdate.mockClear();
  });

  it("creates batch", async () => {
    mockValues.mockResolvedValue(undefined);
    await createVideoGenBatch({ id: "v1" } as never);
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({ id: "v1" });
  });

  it("updates batch", async () => {
    mockReturning.mockResolvedValue([{ id: "v1" }]);
    const result = await updateVideoGenBatch("v1", { status: "queued" } as never);
    expect(result).toEqual({ id: "v1" });
  });

  it("throws for missing id or missing row", async () => {
    await expect(updateVideoGenBatch("", {})).rejects.toThrow("videoId is required");

    mockReturning.mockResolvedValue([]);
    await expect(updateVideoGenBatch("v1", {})).rejects.toThrow(
      "Video generation batch v1 not found"
    );
  });
});
