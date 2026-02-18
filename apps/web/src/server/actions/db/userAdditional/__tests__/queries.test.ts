const mockInsertOnConflictDoNothing = jest.fn();
const mockInsertValues = jest.fn(() => ({ onConflictDoNothing: mockInsertOnConflictDoNothing }));
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockWithDbErrorHandling = jest.fn(async (fn: () => Promise<unknown>) => await fn());

jest.mock("@db/client", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args)
  },
  userAdditional: { userId: "userId" },
  eq: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => mockWithDbErrorHandling(...args)
}));

import {
  getOrCreateUserAdditional,
  getUserProfileCompletion
} from "@web/src/server/actions/db/userAdditional/queries";

describe("userAdditional queries", () => {
  beforeEach(() => {
    mockInsertOnConflictDoNothing.mockReset();
    mockInsertValues.mockClear();
    mockInsert.mockClear();
    mockSelectWhere.mockReset();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
    mockWithDbErrorHandling.mockClear();
  });

  it("validates user id", async () => {
    await expect(getOrCreateUserAdditional(" ")).rejects.toThrow(
      "User ID is required to fetch user details"
    );
    await expect(getUserProfileCompletion("")).rejects.toThrow(
      "User ID is required to check profile completion"
    );
  });

  it("creates missing userAdditional and returns record", async () => {
    mockInsertOnConflictDoNothing.mockResolvedValueOnce(undefined);
    mockSelectWhere.mockResolvedValueOnce([{ userId: "u1" }]);

    await expect(getOrCreateUserAdditional("u1")).resolves.toEqual({ userId: "u1" });
  });

  it("throws when userAdditional record cannot be loaded", async () => {
    mockInsertOnConflictDoNothing.mockResolvedValueOnce(undefined);
    mockSelectWhere.mockResolvedValueOnce([]);

    await expect(getOrCreateUserAdditional("u1")).rejects.toThrow(
      "Failed to load user details"
    );
  });

  it("returns false completion flags when record is absent", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);

    await expect(getUserProfileCompletion("u1")).resolves.toEqual({
      profileCompleted: false,
      writingStyleCompleted: false,
      mediaUploaded: false
    });
  });

  it("returns completion flags based on record timestamps", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        profileCompletedAt: new Date(),
        writingStyleCompletedAt: null,
        mediaUploadedAt: new Date()
      }
    ]);

    await expect(getUserProfileCompletion("u1")).resolves.toEqual({
      profileCompleted: true,
      writingStyleCompleted: false,
      mediaUploaded: true
    });
  });
});
