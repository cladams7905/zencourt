const mockInsertReturning = jest.fn();
const mockInsertOnConflictDoNothing = jest.fn();
const mockInsertOnConflictDoUpdate = jest.fn(() => ({ returning: mockInsertReturning }));
const mockInsertValues = jest.fn(() => ({
  onConflictDoUpdate: mockInsertOnConflictDoUpdate,
  onConflictDoNothing: mockInsertOnConflictDoNothing
}));
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockUpdateReturning = jest.fn();
const mockUpdateWhere = jest.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockWithDbErrorHandling = jest.fn(async (fn: () => Promise<unknown>) => await fn());

jest.mock("@db/client", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args)
  },
  userAdditional: { userId: "userId" },
  eq: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => mockWithDbErrorHandling(...args)
}));

import {
  completeWelcomeSurvey,
  markProfileCompleted,
  markWritingStyleCompleted,
  updateTargetAudiences,
  updateUserLocation,
  updateUserProfile,
  updateWritingStyle
} from "@web/src/server/actions/db/userAdditional/mutations";

describe("userAdditional mutations", () => {
  beforeEach(() => {
    mockInsertReturning.mockReset();
    mockInsertOnConflictDoNothing.mockReset();
    mockInsertOnConflictDoUpdate.mockClear();
    mockInsertValues.mockClear();
    mockInsert.mockClear();
    mockUpdateReturning.mockReset();
    mockUpdateWhere.mockClear();
    mockUpdateSet.mockClear();
    mockUpdate.mockClear();
    mockWithDbErrorHandling.mockClear();
  });

  it("validates user ids", async () => {
    await expect(completeWelcomeSurvey("", {} as never)).rejects.toThrow(
      "User ID is required to complete the survey"
    );
    await expect(updateUserProfile("", {} as never)).rejects.toThrow(
      "User ID is required to update profile"
    );
    await expect(markProfileCompleted(" ")).rejects.toThrow(
      "User ID is required to mark profile completion"
    );
  });

  it("completes welcome survey", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ userId: "u1" }]);
    await expect(completeWelcomeSurvey("u1", { location: "X" } as never)).resolves.toEqual({
      userId: "u1"
    });
  });

  it("updates target audiences", async () => {
    mockInsertOnConflictDoNothing.mockResolvedValueOnce(undefined);
    mockUpdateReturning.mockResolvedValueOnce([{ userId: "u1", targetAudiences: ["a"] }]);

    await expect(updateTargetAudiences("u1", ["a"] as never)).resolves.toEqual({
      userId: "u1",
      targetAudiences: ["a"]
    });
  });

  it("updates user profile and location", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ userId: "u1", agentName: "Agent" }]);
    await expect(updateUserProfile("u1", { agentName: "Agent" })).resolves.toEqual({
      userId: "u1",
      agentName: "Agent"
    });

    mockInsertReturning.mockResolvedValueOnce([{ userId: "u1", location: "CA" }]);
    await expect(
      updateUserLocation("u1", "CA" as never, { county: "Orange", serviceAreas: ["Irvine"] })
    ).resolves.toEqual({ userId: "u1", location: "CA" });
  });

  it("updates writing style", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ userId: "u1", writingToneLevel: "warm" }]);
    await expect(updateWritingStyle("u1", { writingToneLevel: "warm" } as never)).resolves.toEqual(
      { userId: "u1", writingToneLevel: "warm" }
    );
  });

  it("marks profile and writing style completion", async () => {
    mockUpdateReturning.mockResolvedValueOnce([{ userId: "u1", profileCompletedAt: new Date() }]);
    await expect(markProfileCompleted("u1")).resolves.toEqual(
      expect.objectContaining({ userId: "u1" })
    );

    mockUpdateReturning.mockResolvedValueOnce([
      { userId: "u1", writingStyleCompletedAt: new Date() }
    ]);
    await expect(markWritingStyleCompleted("u1")).resolves.toEqual(
      expect.objectContaining({ userId: "u1" })
    );
  });

  it("throws when updates cannot be persisted", async () => {
    mockInsertReturning.mockResolvedValueOnce([]);
    await expect(completeWelcomeSurvey("u1", {} as never)).rejects.toThrow(
      "Survey could not be saved"
    );

    mockUpdateReturning.mockResolvedValueOnce([]);
    await expect(markProfileCompleted("u1")).rejects.toThrow(
      "Profile completion could not be saved"
    );
  });
});
