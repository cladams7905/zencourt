const mockValues = jest.fn();
const mockOnConflictDoNothing = jest.fn();
const mockOnConflictDoUpdate = jest.fn();
const mockReturning = jest.fn();
const mockInsertBuilder = {
  values: (...args: unknown[]) => mockValues(...args),
  onConflictDoNothing: (...args: unknown[]) => mockOnConflictDoNothing(...args),
  onConflictDoUpdate: (...args: unknown[]) => mockOnConflictDoUpdate(...args)
};

jest.mock("@db/client", () => ({
  db: {
    insert: jest.fn(() => mockInsertBuilder)
  },
  userAdditional: {
    userId: "userId"
  }
}));

beforeEach(() => {
  mockValues.mockReset();
  mockOnConflictDoNothing.mockReset();
  mockOnConflictDoUpdate.mockReset();
  mockReturning.mockReset();
  mockValues.mockReturnValue({
    onConflictDoNothing: (...args: unknown[]) => mockOnConflictDoNothing(...args),
    onConflictDoUpdate: (...args: unknown[]) => mockOnConflictDoUpdate(...args)
  });
  mockOnConflictDoNothing.mockReturnValue(Promise.resolve());
  mockOnConflictDoUpdate.mockReturnValue({
    returning: (...args: unknown[]) => mockReturning(...args)
  });
});

import { ensureUserAdditionalExists, upsertUserAdditional } from "../helpers";

describe("userAdditional helpers", () => {
  it("ensures additional record exists with onConflictDoNothing", async () => {
    await ensureUserAdditionalExists("u1");

    expect(mockValues).toHaveBeenCalledWith({ userId: "u1" });
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
  });

  it("upserts and returns record", async () => {
    mockReturning.mockResolvedValueOnce([{ userId: "u1", bio: "hello" }]);

    const result = await upsertUserAdditional(
      "u1",
      { bio: "hello" } as never,
      "not found"
    );

    expect(mockValues).toHaveBeenCalledWith({ userId: "u1", bio: "hello" });
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    expect(result).toEqual({ userId: "u1", bio: "hello" });
  });

  it("throws custom not found message when returning is empty", async () => {
    mockReturning.mockResolvedValueOnce([]);

    await expect(
      upsertUserAdditional("u1", { bio: "hello" } as never, "not found")
    ).rejects.toThrow("not found");
  });
});
