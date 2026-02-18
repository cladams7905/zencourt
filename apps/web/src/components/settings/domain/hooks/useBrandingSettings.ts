import * as React from "react";
import type { BrandingTabProps } from "@web/src/components/settings/shared";
import {
  AGENT_BIO_MAX_CHARS,
  AUDIENCE_DESCRIPTION_MAX_CHARS,
  WRITING_STYLE_MAX_CHARS
} from "@web/src/components/settings/shared";
import { useBrandingAudienceSettings } from "./useBrandingAudienceSettings";
import { useBrandingProfileSettings } from "./useBrandingProfileSettings";
import { useBrandingWritingStyleSettings } from "./useBrandingWritingStyleSettings";

export const useBrandingSettings = ({
  userId,
  userAdditional,
  defaultAgentName,
  defaultHeadshotUrl,
  onDirtyChange,
  onRegisterSave,
  isActive = true
}: BrandingTabProps) => {
  const profile = useBrandingProfileSettings({
    userId,
    userAdditional,
    defaultAgentName,
    defaultHeadshotUrl
  });
  const audiences = useBrandingAudienceSettings({ userId, userAdditional });
  const writingStyle = useBrandingWritingStyleSettings({
    userId,
    userAdditional,
    isActive
  });
  const { isAgentInfoDirty, handleSaveAgentInfo } = profile;
  const { isTargetAudiencesDirty, handleSaveTargetAudiences } = audiences;
  const { isWritingStyleDirty, handleSaveWritingStyle } = writingStyle;

  const hasUnsavedChanges = React.useMemo(() => {
    return (
      isAgentInfoDirty ||
      isTargetAudiencesDirty ||
      isWritingStyleDirty
    );
  }, [isAgentInfoDirty, isTargetAudiencesDirty, isWritingStyleDirty]);

  React.useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const handleSaveAllChanges = React.useCallback(async () => {
    if (isAgentInfoDirty) {
      await handleSaveAgentInfo();
    }
    if (isTargetAudiencesDirty) {
      await handleSaveTargetAudiences();
    }
    if (isWritingStyleDirty) {
      await handleSaveWritingStyle();
    }
  }, [
    isAgentInfoDirty,
    handleSaveAgentInfo,
    isTargetAudiencesDirty,
    handleSaveTargetAudiences,
    isWritingStyleDirty,
    handleSaveWritingStyle
  ]);

  React.useEffect(() => {
    onRegisterSave?.(handleSaveAllChanges);
  }, [handleSaveAllChanges, onRegisterSave]);

  return {
    AGENT_BIO_MAX_CHARS,
    AUDIENCE_DESCRIPTION_MAX_CHARS,
    WRITING_STYLE_MAX_CHARS,
    ...profile,
    ...audiences,
    ...writingStyle
  };
};
