"use client";

import type { BrandingTabProps } from "@web/src/components/settings/shared";
import { useBrandingSettings } from "@web/src/components/settings/domain";
import { BrandingAgentInfoSection } from "./BrandingAgentInfoSection";
import { BrandingTargetAudiencesSection } from "./BrandingTargetAudiencesSection";
import { BrandingWritingStyleSection } from "./BrandingWritingStyleSection";

export function BrandingTab({
  userAdditional,
  defaultAgentName,
  defaultHeadshotUrl,
  onDirtyChange,
  onRegisterSave,
  isActive = true
}: BrandingTabProps) {
  const {
    AGENT_BIO_MAX_CHARS,
    AUDIENCE_DESCRIPTION_MAX_CHARS,
    WRITING_STYLE_MAX_CHARS,
    agentName,
    setAgentName,
    brokerageName,
    setBrokerageName,
    agentTitle,
    setAgentTitle,
    agentBio,
    setAgentBio,
    avatarPreviewUrl,
    brokerLogoPreviewUrl,
    getPreviewImageProps,
    isUploadingAvatar,
    isUploadingBrokerLogo,
    isSavingProfile,
    handleImageUpload,
    handleImageRemove,
    isAgentInfoDirty,
    handleSaveAgentInfo,
    targetAudiences,
    audienceDescription,
    setAudienceDescription,
    toggleTargetAudience,
    isTargetAudiencesDirty,
    isLoadingAudiences,
    handleSaveTargetAudiences,
    toneMeta,
    toneValue,
    setWritingToneLevel,
    writingStyleCustom,
    setWritingStyleCustom,
    isWritingStyleDirty,
    isLoadingStyle,
    handleSaveWritingStyle,
    writingStyleSentinelRef
  } = useBrandingSettings({
    userAdditional,
    defaultAgentName,
    defaultHeadshotUrl,
    onDirtyChange,
    onRegisterSave,
    isActive
  });

  return (
    <div className="grid gap-6">
      <BrandingAgentInfoSection
        agentName={agentName}
        setAgentName={setAgentName}
        brokerageName={brokerageName}
        setBrokerageName={setBrokerageName}
        agentTitle={agentTitle}
        setAgentTitle={setAgentTitle}
        agentBio={agentBio}
        setAgentBio={setAgentBio}
        AGENT_BIO_MAX_CHARS={AGENT_BIO_MAX_CHARS}
        avatarPreviewUrl={avatarPreviewUrl}
        brokerLogoPreviewUrl={brokerLogoPreviewUrl}
        getPreviewImageProps={getPreviewImageProps}
        isUploadingAvatar={isUploadingAvatar}
        isUploadingBrokerLogo={isUploadingBrokerLogo}
        isSavingProfile={isSavingProfile}
        handleImageUpload={handleImageUpload}
        handleImageRemove={handleImageRemove}
        isAgentInfoDirty={isAgentInfoDirty}
        handleSaveAgentInfo={handleSaveAgentInfo}
      />

      <BrandingTargetAudiencesSection
        targetAudiences={targetAudiences}
        toggleTargetAudience={toggleTargetAudience}
        audienceDescription={audienceDescription}
        setAudienceDescription={setAudienceDescription}
        AUDIENCE_DESCRIPTION_MAX_CHARS={AUDIENCE_DESCRIPTION_MAX_CHARS}
        isTargetAudiencesDirty={isTargetAudiencesDirty}
        isLoadingAudiences={isLoadingAudiences}
        handleSaveTargetAudiences={handleSaveTargetAudiences}
      />

      <BrandingWritingStyleSection
        toneMeta={toneMeta}
        toneValue={toneValue}
        setWritingToneLevel={setWritingToneLevel}
        writingStyleCustom={writingStyleCustom}
        setWritingStyleCustom={setWritingStyleCustom}
        WRITING_STYLE_MAX_CHARS={WRITING_STYLE_MAX_CHARS}
        isWritingStyleDirty={isWritingStyleDirty}
        isLoadingStyle={isLoadingStyle}
        handleSaveWritingStyle={handleSaveWritingStyle}
        writingStyleSentinelRef={writingStyleSentinelRef}
      />
    </div>
  );
}
