const mockUpdateUserProfile = jest.fn();
const mockEnsureGoogleHeadshot = jest.fn();
const mockUpdateUserLocation = jest.fn();
const mockUpdateTargetAudiences = jest.fn();
const mockUpdateWritingStyle = jest.fn();
const mockMarkWritingStyleCompleted = jest.fn();
const mockMarkProfileCompleted = jest.fn();
const mockCompleteWelcomeSurvey = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();

jest.mock("@web/src/server/models/userAdditional", () => ({
  updateUserProfile: (...args: unknown[]) =>
    (mockUpdateUserProfile as (...a: unknown[]) => unknown)(...args),
  ensureGoogleHeadshot: (...args: unknown[]) =>
    (mockEnsureGoogleHeadshot as (...a: unknown[]) => unknown)(...args),
  updateUserLocation: (...args: unknown[]) =>
    (mockUpdateUserLocation as (...a: unknown[]) => unknown)(...args),
  updateTargetAudiences: (...args: unknown[]) =>
    (mockUpdateTargetAudiences as (...a: unknown[]) => unknown)(...args),
  updateWritingStyle: (...args: unknown[]) =>
    (mockUpdateWritingStyle as (...a: unknown[]) => unknown)(...args),
  markWritingStyleCompleted: (...args: unknown[]) =>
    (mockMarkWritingStyleCompleted as (...a: unknown[]) => unknown)(...args),
  markProfileCompleted: (...args: unknown[]) =>
    (mockMarkProfileCompleted as (...a: unknown[]) => unknown)(...args),
  completeWelcomeSurvey: (...args: unknown[]) =>
    (mockCompleteWelcomeSurvey as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/utils/apiAuth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

import {
  updateCurrentUserProfile,
  ensureCurrentUserGoogleHeadshot,
  updateCurrentUserLocation,
  updateCurrentUserTargetAudiences,
  updateCurrentUserWritingStyle,
  markCurrentUserWritingStyleCompleted,
  markCurrentUserProfileCompleted,
  completeCurrentUserWelcomeSurvey
} from "@web/src/server/actions/user/commands";

describe("user commands", () => {
  const mockUser = { id: "user-1" } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
  });

  it("updateCurrentUserProfile delegates with user id", async () => {
    const updates = { agentName: "Jane" } as never;
    mockUpdateUserProfile.mockResolvedValueOnce({ id: "user-1" });

    await updateCurrentUserProfile(updates);

    expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
    expect(mockUpdateUserProfile).toHaveBeenCalledWith("user-1", updates);
  });

  it("ensureCurrentUserGoogleHeadshot delegates with user id", async () => {
    mockEnsureGoogleHeadshot.mockResolvedValueOnce(undefined);

    await ensureCurrentUserGoogleHeadshot("https://example.com/photo.jpg");

    expect(mockEnsureGoogleHeadshot).toHaveBeenCalledWith(
      "user-1",
      "https://example.com/photo.jpg"
    );
  });

  it("updateCurrentUserLocation delegates with user id and details", async () => {
    mockUpdateUserLocation.mockResolvedValueOnce(undefined);

    await updateCurrentUserLocation("San Francisco", {
      county: "SF",
      serviceAreas: ["Bay Area"]
    });

    expect(mockUpdateUserLocation).toHaveBeenCalledWith("user-1", "San Francisco", {
      county: "SF",
      serviceAreas: ["Bay Area"]
    });
  });

  it("updateCurrentUserTargetAudiences delegates with user id", async () => {
    const targetAudiences = ["first-time"] as never;
    mockUpdateTargetAudiences.mockResolvedValueOnce(undefined);

    await updateCurrentUserTargetAudiences(targetAudiences, "description");

    expect(mockUpdateTargetAudiences).toHaveBeenCalledWith(
      "user-1",
      targetAudiences,
      "description"
    );
  });

  it("updateCurrentUserWritingStyle delegates with user id", async () => {
    const updates = { writingToneLevel: 2 } as never;
    mockUpdateWritingStyle.mockResolvedValueOnce(undefined);

    await updateCurrentUserWritingStyle(updates);

    expect(mockUpdateWritingStyle).toHaveBeenCalledWith("user-1", updates);
  });

  it("markCurrentUserWritingStyleCompleted delegates", async () => {
    mockMarkWritingStyleCompleted.mockResolvedValueOnce(undefined);

    await markCurrentUserWritingStyleCompleted();

    expect(mockMarkWritingStyleCompleted).toHaveBeenCalledWith("user-1");
  });

  it("markCurrentUserProfileCompleted delegates", async () => {
    mockMarkProfileCompleted.mockResolvedValueOnce(undefined);

    await markCurrentUserProfileCompleted();

    expect(mockMarkProfileCompleted).toHaveBeenCalledWith("user-1");
  });

  it("completeCurrentUserWelcomeSurvey delegates with user id", async () => {
    const updates = { referralSource: "google" } as never;
    mockCompleteWelcomeSurvey.mockResolvedValueOnce(undefined);

    await completeCurrentUserWelcomeSurvey(updates);

    expect(mockCompleteWelcomeSurvey).toHaveBeenCalledWith("user-1", updates);
  });
});
