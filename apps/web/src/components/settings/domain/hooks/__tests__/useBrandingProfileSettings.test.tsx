import { act, renderHook } from "@testing-library/react";
import { useBrandingProfileSettings } from "@web/src/components/settings/domain/hooks/useBrandingProfileSettings";
import type { DBUserAdditional } from "@db/types/models";

const mockRefresh = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockEnsureGoogleHeadshot = jest.fn();
const mockUpdateUserProfile = jest.fn();
const mockUploadFile = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh
  })
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@web/src/server/actions/user/commands", () => ({
  ensureCurrentUserGoogleHeadshot: (...args: unknown[]) =>
    mockEnsureGoogleHeadshot(...args),
  updateCurrentUserProfile: (...args: unknown[]) => mockUpdateUserProfile(...args)
}));

jest.mock("@web/src/server/actions/storage/commands", () => ({
  uploadFileFromBuffer: (...args: unknown[]) => mockUploadFile(...args)
}));

describe("useBrandingProfileSettings", () => {
  const baseUserAdditional = {
    agentName: "",
    brokerageName: "",
    agentTitle: "",
    agentBio: "",
    headshotUrl: "",
    personalLogoUrl: ""
  } as unknown as DBUserAdditional;

  const baseArgs = {
    userId: "u1",
    userAdditional: baseUserAdditional,
    defaultAgentName: "Default Agent",
    defaultHeadshotUrl: undefined
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => "blob:test");
    global.URL.revokeObjectURL = jest.fn();
    mockEnsureGoogleHeadshot.mockResolvedValue(null);
    mockUpdateUserProfile.mockResolvedValue({});
    mockUploadFile.mockResolvedValue("https://cdn.example/new.png");
  });

  it("initializes and computes profile dirtiness", () => {
    const { result } = renderHook(() => useBrandingProfileSettings(baseArgs));

    expect(result.current.agentName).toBe("Default Agent");
    expect(result.current.isAgentInfoDirty).toBe(false);

    act(() => {
      result.current.setAgentName("Updated Name");
    });

    expect(result.current.isAgentInfoDirty).toBe(true);
  });

  it("saves agent info and resets dirty state", async () => {
    mockUpdateUserProfile.mockResolvedValue({
      agentBio: "Saved bio"
    });

    const { result } = renderHook(() => useBrandingProfileSettings(baseArgs));

    act(() => {
      result.current.setAgentName("Updated Name");
      result.current.setAgentBio("Saved bio");
    });

    await act(async () => {
      await result.current.handleSaveAgentInfo();
    });

    expect(mockUpdateUserProfile).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Agent information updated successfully!"
    );
    expect(mockRefresh).toHaveBeenCalled();
    expect(result.current.isAgentInfoDirty).toBe(false);
  });

  it("rejects oversized uploads", async () => {
    const { result } = renderHook(() => useBrandingProfileSettings(baseArgs));
    const bigFile = new File([new Uint8Array(1024 * 1024 + 1)], "big.png", {
      type: "image/png"
    });

    await act(async () => {
      await result.current.handleImageUpload(bigFile, "headshotUrl", "Headshot");
    });

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith("Headshot must be smaller than 1 MB.");
  });

  it("uploads image and persists profile update", async () => {
    const { result } = renderHook(() => useBrandingProfileSettings(baseArgs));
    const smallFile = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
      type: "image/png"
    });
    Object.defineProperty(smallFile, "arrayBuffer", {
      value: async () => new Uint8Array([1, 2, 3]).buffer
    });

    await act(async () => {
      await result.current.handleImageUpload(smallFile, "headshotUrl", "Headshot");
    });

    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "avatar.png",
        contentType: "image/png",
        folder: "user_u1/branding"
      })
    );
    expect(mockUpdateUserProfile).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Successfully updated Headshot to avatar.png."
    );
  });

  it("seeds google headshot when default is present and no existing headshot", async () => {
    mockEnsureGoogleHeadshot.mockResolvedValue("https://cdn.example/google.png");

    renderHook(() =>
      useBrandingProfileSettings({
        ...baseArgs,
        defaultHeadshotUrl: "https://google/avatar.png"
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockEnsureGoogleHeadshot).toHaveBeenCalledWith(
      "https://google/avatar.png"
    );
  });

  it("removes image and persists cleared value", async () => {
    const { result } = renderHook(() =>
      useBrandingProfileSettings({
        ...baseArgs,
        userAdditional: {
          ...baseArgs.userAdditional,
          personalLogoUrl: "https://cdn.example/logo.png"
        }
      })
    );

    await act(async () => {
      await result.current.handleImageRemove("personalLogoUrl", "Logo");
    });

    expect(mockUpdateUserProfile).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Successfully updated Logo to removed."
    );
  });

  it("surfaces upload failures", async () => {
    mockUploadFile.mockRejectedValueOnce(new Error("upload failed"));
    const { result } = renderHook(() => useBrandingProfileSettings(baseArgs));
    const smallFile = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
      type: "image/png"
    });
    Object.defineProperty(smallFile, "arrayBuffer", {
      value: async () => new Uint8Array([1, 2, 3]).buffer
    });

    await act(async () => {
      await result.current.handleImageUpload(smallFile, "headshotUrl", "Headshot");
    });

    expect(mockToastError).toHaveBeenCalledWith("upload failed");
    expect(result.current.isUploadingAvatar).toBe(false);
  });
});
