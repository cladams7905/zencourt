import { act, renderHook } from "@testing-library/react";
import { useBrandingSettings } from "@web/src/components/settings/domain/hooks/useBrandingSettings";

const mockUseBrandingProfileSettings = jest.fn();
const mockUseBrandingAudienceSettings = jest.fn();
const mockUseBrandingWritingStyleSettings = jest.fn();

jest.mock("@web/src/components/settings/domain/hooks/useBrandingProfileSettings", () => ({
  useBrandingProfileSettings: (...args: unknown[]) =>
    mockUseBrandingProfileSettings(...args)
}));

jest.mock("@web/src/components/settings/domain/hooks/useBrandingAudienceSettings", () => ({
  useBrandingAudienceSettings: (...args: unknown[]) =>
    mockUseBrandingAudienceSettings(...args)
}));

jest.mock("@web/src/components/settings/domain/hooks/useBrandingWritingStyleSettings", () => ({
  useBrandingWritingStyleSettings: (...args: unknown[]) =>
    mockUseBrandingWritingStyleSettings(...args)
}));

describe("useBrandingSettings", () => {
  const baseProfile = {
    isAgentInfoDirty: false,
    handleSaveAgentInfo: jest.fn()
  };
  const baseAudiences = {
    isTargetAudiencesDirty: false,
    handleSaveTargetAudiences: jest.fn()
  };
  const baseWritingStyle = {
    isWritingStyleDirty: false,
    handleSaveWritingStyle: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBrandingProfileSettings.mockReturnValue(baseProfile);
    mockUseBrandingAudienceSettings.mockReturnValue(baseAudiences);
    mockUseBrandingWritingStyleSettings.mockReturnValue(baseWritingStyle);
  });

  it("reports aggregated dirty state", () => {
    const onDirtyChange = jest.fn();
    mockUseBrandingAudienceSettings.mockReturnValue({
      ...baseAudiences,
      isTargetAudiencesDirty: true
    });

    renderHook(() =>
      useBrandingSettings({
        userAdditional: {} as never,
        onDirtyChange
      } as never)
    );

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it("registers save-all and only saves dirty sections", async () => {
    const onRegisterSave = jest.fn();
    const saveAgent = jest.fn().mockResolvedValue(undefined);
    const saveAudiences = jest.fn().mockResolvedValue(undefined);
    const saveStyle = jest.fn().mockResolvedValue(undefined);

    mockUseBrandingProfileSettings.mockReturnValue({
      ...baseProfile,
      isAgentInfoDirty: true,
      handleSaveAgentInfo: saveAgent
    });
    mockUseBrandingAudienceSettings.mockReturnValue({
      ...baseAudiences,
      isTargetAudiencesDirty: false,
      handleSaveTargetAudiences: saveAudiences
    });
    mockUseBrandingWritingStyleSettings.mockReturnValue({
      ...baseWritingStyle,
      isWritingStyleDirty: true,
      handleSaveWritingStyle: saveStyle
    });

    renderHook(() =>
      useBrandingSettings({
        userAdditional: {} as never,
        onRegisterSave
      } as never)
    );

    const saveAll = onRegisterSave.mock.calls[0][0] as () => Promise<void>;
    await act(async () => {
      await saveAll();
    });

    expect(saveAgent).toHaveBeenCalledTimes(1);
    expect(saveAudiences).not.toHaveBeenCalled();
    expect(saveStyle).toHaveBeenCalledTimes(1);
  });
});
