const mockUpdateUserProfile = jest.fn();
const mockEnsureGoogleHeadshot = jest.fn();
const mockUpdateUserLocation = jest.fn();
const mockUpdateTargetAudiences = jest.fn();
const mockUpdateWritingStyle = jest.fn();
const mockMarkWritingStyleCompleted = jest.fn();
const mockMarkProfileCompleted = jest.fn();
const mockCompleteWelcomeSurvey = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockUserAdditionalWhere = jest.fn();
const mockUserAdditionalFrom = jest.fn(() => ({ where: mockUserAdditionalWhere }));
const mockUserAdditionalSelect = jest.fn(() => ({ from: mockUserAdditionalFrom }));

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => mockUserAdditionalSelect(...args)
  },
  eq: (...args: unknown[]) => args,
  userAdditional: { userId: "userId", headshotUrl: "headshotUrl" }
}));

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

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

const mockUploadFile = jest.fn();
jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: { uploadFile: (...args: unknown[]) => mockUploadFile(...args) }
}));

const mockUpsertUserAdditional = jest.fn();
jest.mock("@web/src/server/models/userAdditional/helpers", () => ({
  upsertUserAdditional: (...args: unknown[]) =>
    (mockUpsertUserAdditional as (...a: unknown[]) => unknown)(...args)
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
    mockUserAdditionalWhere.mockResolvedValue([]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    }) as typeof fetch;
  });

  it("updateCurrentUserProfile delegates with user id", async () => {
    const updates = { agentName: "Jane" } as never;
    mockUpdateUserProfile.mockResolvedValueOnce({ id: "user-1" });

    await updateCurrentUserProfile(updates);

    expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
    expect(mockUpdateUserProfile).toHaveBeenCalledWith("user-1", updates);
  });

  it("ensureCurrentUserGoogleHeadshot fetches, uploads, and saves headshot", async () => {
    const headshotUrl = "https://storage.example.com/user_1/branding/google-headshot.jpg";
    mockUploadFile.mockResolvedValueOnce({ success: true, url: headshotUrl });
    mockUpsertUserAdditional.mockResolvedValueOnce({
      headshotUrl,
      updatedAt: new Date()
    });

    const result = await ensureCurrentUserGoogleHeadshot(
      "https://example.com/photo.jpg"
    );

    expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/photo.jpg",
      { cache: "no-store" }
    );
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "google-headshot.jpg",
        contentType: "image/jpeg",
        options: { folder: "user_user-1/branding" }
      })
    );
    expect(mockUpsertUserAdditional).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ headshotUrl }),
      "Headshot could not be saved"
    );
    expect(result).toBe(headshotUrl);
  });

  it("returns null when googleImageUrl is empty", async () => {
    await expect(ensureCurrentUserGoogleHeadshot("")).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("returns existing headshot without fetch/upload", async () => {
    mockUserAdditionalWhere.mockResolvedValueOnce([
      { headshotUrl: "https://existing-headshot" }
    ]);
    await expect(
      ensureCurrentUserGoogleHeadshot("https://example.com/photo.jpg")
    ).resolves.toBe("https://existing-headshot");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("throws when google headshot download fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      headers: { get: () => "image/jpeg" }
    }) as typeof fetch;
    await expect(
      ensureCurrentUserGoogleHeadshot("https://example.com/photo.jpg")
    ).rejects.toThrow("Failed to download Google headshot");
  });

  it("chooses png/webp extension and throws on upload failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/png" },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    }) as typeof fetch;
    mockUploadFile.mockResolvedValueOnce({ success: false, error: "bad upload" });
    await expect(
      ensureCurrentUserGoogleHeadshot("https://example.com/photo.png")
    ).rejects.toThrow("bad upload");
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "google-headshot.png" })
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/webp" },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    }) as typeof fetch;
    mockUploadFile.mockResolvedValueOnce({ success: true, url: "https://storage/headshot.webp" });
    mockUpsertUserAdditional.mockResolvedValueOnce(null);
    await expect(
      ensureCurrentUserGoogleHeadshot("https://example.com/photo.webp")
    ).resolves.toBe("https://storage/headshot.webp");
    expect(mockUploadFile).toHaveBeenLastCalledWith(
      expect.objectContaining({ fileName: "google-headshot.webp" })
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

  it("updateCurrentUserLocation fills nullable defaults", async () => {
    await updateCurrentUserLocation("Austin");
    expect(mockUpdateUserLocation).toHaveBeenCalledWith("user-1", "Austin", {
      county: null,
      serviceAreas: null
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
