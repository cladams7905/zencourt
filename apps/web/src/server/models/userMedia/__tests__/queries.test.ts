const mockOrderBy = jest.fn();
const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args))
  },
  userMedia: { userId: "userId", uploadedAt: "uploadedAt" },
  eq: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

import { getUserMedia } from "@web/src/server/models/userMedia/queries";

describe("userMedia queries", () => {
  beforeEach(() => {
    mockOrderBy.mockReset();
    mockWhere.mockClear();
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
});
