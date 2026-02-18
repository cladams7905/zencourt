import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BrandingProfileState, BrandingTabProps } from "@web/src/components/settings/shared";
import {
  ensureGoogleHeadshot,
  updateUserProfile
} from "@web/src/server/actions/db/userAdditional";
import {
  getSignedDownloadUrl,
  uploadFile
} from "@web/src/server/actions/api/storage";

interface UseBrandingProfileSettingsArgs {
  userId: string;
  userAdditional: BrandingTabProps["userAdditional"];
  defaultAgentName?: string;
  defaultHeadshotUrl?: string;
}

const normalizeText = (value: string | null | undefined) => (value ?? "").trim();

export const useBrandingProfileSettings = ({
  userId,
  userAdditional,
  defaultAgentName,
  defaultHeadshotUrl
}: UseBrandingProfileSettingsArgs) => {
  const router = useRouter();
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isUploadingBrokerLogo, setIsUploadingBrokerLogo] =
    React.useState(false);

  const initialAgentName = userAdditional.agentName || defaultAgentName || "";
  const initialHeadshotUrl = userAdditional.headshotUrl || "";
  const [agentName, setAgentName] = React.useState(initialAgentName);
  const [brokerageName, setBrokerageName] = React.useState(
    userAdditional.brokerageName || ""
  );
  const [agentTitle, setAgentTitle] = React.useState(
    userAdditional.agentTitle || ""
  );
  const [agentBio, setAgentBio] = React.useState(userAdditional.agentBio || "");
  const [headshotUrl, setHeadshotUrl] = React.useState(initialHeadshotUrl);
  const [personalLogoUrl, setPersonalLogoUrl] = React.useState(
    userAdditional.personalLogoUrl || ""
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] =
    React.useState(initialHeadshotUrl);
  const [brokerLogoPreviewUrl, setBrokerLogoPreviewUrl] = React.useState(
    userAdditional.personalLogoUrl || ""
  );
  const [initialAgentInfo, setInitialAgentInfo] = React.useState(() => ({
    agentName: initialAgentName,
    brokerageName: userAdditional.brokerageName || "",
    agentTitle: userAdditional.agentTitle || "",
    agentBio: userAdditional.agentBio || ""
  }));

  const savedProfileRef = React.useRef<BrandingProfileState>({
    agentName: initialAgentName,
    brokerageName: userAdditional.brokerageName || "",
    headshotUrl: initialHeadshotUrl,
    personalLogoUrl: userAdditional.personalLogoUrl || "",
    agentBio: userAdditional.agentBio || ""
  });

  const avatarPreviewRef = React.useRef<string | null>(null);
  const brokerLogoPreviewRef = React.useRef<string | null>(null);
  const hasSeededHeadshotRef = React.useRef(false);

  const getPreviewImageProps = React.useCallback((url: string) => {
    if (!url) {
      return { src: "", unoptimized: false };
    }
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      return { src: url, unoptimized: true };
    }
    return { src: url, unoptimized: true };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const resolveSignedUrl = async () => {
      if (!headshotUrl) {
        if (isMounted) {
          setAvatarPreviewUrl("");
        }
        return;
      }
      if (headshotUrl.startsWith("blob:") || headshotUrl.startsWith("data:")) {
        if (isMounted) {
          setAvatarPreviewUrl(headshotUrl);
        }
        return;
      }
      try {
        const signed = await getSignedDownloadUrl(headshotUrl);
        if (isMounted) {
          setAvatarPreviewUrl(signed);
        }
      } catch (error) {
        if (isMounted) {
          setAvatarPreviewUrl(headshotUrl);
        }
        toast.error((error as Error).message || "Failed to load headshot preview");
      }
    };

    void resolveSignedUrl();
    return () => {
      isMounted = false;
    };
  }, [headshotUrl]);

  React.useEffect(() => {
    let isMounted = true;

    const resolveSignedUrl = async () => {
      if (!personalLogoUrl) {
        if (isMounted) {
          setBrokerLogoPreviewUrl("");
        }
        return;
      }
      if (
        personalLogoUrl.startsWith("blob:") ||
        personalLogoUrl.startsWith("data:")
      ) {
        if (isMounted) {
          setBrokerLogoPreviewUrl(personalLogoUrl);
        }
        return;
      }
      try {
        const signed = await getSignedDownloadUrl(personalLogoUrl);
        if (isMounted) {
          setBrokerLogoPreviewUrl(signed);
        }
      } catch (error) {
        if (isMounted) {
          setBrokerLogoPreviewUrl(personalLogoUrl);
        }
        toast.error((error as Error).message || "Failed to load logo preview");
      }
    };

    void resolveSignedUrl();
    return () => {
      isMounted = false;
    };
  }, [personalLogoUrl]);

  React.useEffect(() => {
    if (hasSeededHeadshotRef.current) {
      return;
    }
    if (headshotUrl || !defaultHeadshotUrl) {
      return;
    }

    hasSeededHeadshotRef.current = true;
    setIsUploadingAvatar(true);
    ensureGoogleHeadshot(userId, defaultHeadshotUrl)
      .then((url) => {
        if (!url) {
          return;
        }
        setHeadshotUrl(url);
        setAvatarPreviewUrl(url);
        savedProfileRef.current = {
          ...savedProfileRef.current,
          headshotUrl: url
        };
      })
      .catch((error) => {
        toast.error((error as Error).message || "Failed to save Google headshot");
      })
      .finally(() => {
        setIsUploadingAvatar(false);
      });
  }, [defaultHeadshotUrl, headshotUrl, userId]);

  const isAgentInfoDirty = React.useMemo(() => {
    return (
      normalizeText(agentName) !== normalizeText(initialAgentInfo.agentName) ||
      normalizeText(brokerageName) !==
        normalizeText(initialAgentInfo.brokerageName) ||
      normalizeText(agentTitle) !== normalizeText(initialAgentInfo.agentTitle) ||
      normalizeText(agentBio) !== normalizeText(initialAgentInfo.agentBio)
    );
  }, [agentName, brokerageName, agentTitle, agentBio, initialAgentInfo]);

  React.useEffect(() => {
    if (avatarPreviewRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreviewRef.current);
    }
    avatarPreviewRef.current = avatarPreviewUrl || null;
  }, [avatarPreviewUrl]);

  React.useEffect(() => {
    if (brokerLogoPreviewRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(brokerLogoPreviewRef.current);
    }
    brokerLogoPreviewRef.current = brokerLogoPreviewUrl || null;
  }, [brokerLogoPreviewUrl]);

  React.useEffect(() => {
    return () => {
      if (avatarPreviewRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewRef.current);
      }
      if (brokerLogoPreviewRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(brokerLogoPreviewRef.current);
      }
    };
  }, []);

  const getProfileSnapshot = (
    overrides: Partial<BrandingProfileState> = {}
  ): BrandingProfileState => ({
    agentName: overrides.agentName ?? savedProfileRef.current.agentName,
    brokerageName: overrides.brokerageName ?? savedProfileRef.current.brokerageName,
    headshotUrl: overrides.headshotUrl ?? headshotUrl,
    personalLogoUrl: overrides.personalLogoUrl ?? personalLogoUrl,
    agentBio: overrides.agentBio ?? savedProfileRef.current.agentBio
  });

  const persistProfileUpdate = async (
    fieldName: string,
    fieldValue: string,
    overrides: Partial<BrandingProfileState> = {}
  ) => {
    setIsSavingProfile(true);
    const displayValue = fieldValue.trim() ? fieldValue.trim() : "empty";
    const nextProfile = getProfileSnapshot(overrides);

    try {
      await updateUserProfile(userId, {
        agentName: nextProfile.agentName,
        brokerageName: nextProfile.brokerageName,
        agentTitle: agentTitle || null,
        agentBio: agentBio || null,
        headshotUrl: nextProfile.headshotUrl || null,
        personalLogoUrl: nextProfile.personalLogoUrl || null
      });
      savedProfileRef.current = nextProfile;
      toast.success(`Successfully updated ${fieldName} to ${displayValue}.`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveAgentInfo = React.useCallback(async () => {
    setIsSavingProfile(true);
    try {
      const record = await updateUserProfile(userId, {
        agentName,
        brokerageName,
        agentTitle: agentTitle || null,
        agentBio: agentBio || null,
        headshotUrl: savedProfileRef.current.headshotUrl || null,
        personalLogoUrl: savedProfileRef.current.personalLogoUrl || null
      });
      if (record?.agentBio !== undefined) {
        setAgentBio(record.agentBio || "");
      }
      savedProfileRef.current = {
        ...savedProfileRef.current,
        agentName,
        brokerageName,
        agentBio
      };
      setInitialAgentInfo({
        agentName,
        brokerageName,
        agentTitle,
        agentBio: record?.agentBio ?? agentBio
      });
      toast.success("Agent information updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update agent profile");
    } finally {
      setIsSavingProfile(false);
    }
  }, [agentName, brokerageName, agentTitle, agentBio, router, userId]);

  const handleImageUpload = async (
    file: File,
    fieldKey: keyof BrandingProfileState,
    fieldName: string
  ) => {
    if (file.size > 1024 * 1024) {
      toast.error(
        fieldKey === "headshotUrl"
          ? "Headshot must be smaller than 1 MB."
          : "Logo must be smaller than 1 MB."
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (fieldKey === "headshotUrl") {
      setAvatarPreviewUrl(previewUrl);
      setIsUploadingAvatar(true);
    } else {
      setBrokerLogoPreviewUrl(previewUrl);
      setIsUploadingBrokerLogo(true);
    }

    try {
      const uploadedUrl = await uploadFile(file, `user_${userId}/branding`);
      if (fieldKey === "headshotUrl") {
        setHeadshotUrl(uploadedUrl);
        setAvatarPreviewUrl(uploadedUrl);
      } else {
        setPersonalLogoUrl(uploadedUrl);
        setBrokerLogoPreviewUrl(uploadedUrl);
      }
      await persistProfileUpdate(fieldName, file.name, {
        [fieldKey]: uploadedUrl
      });
    } catch (error) {
      toast.error(
        (error as Error).message ||
          `Failed to upload ${fieldName.toLowerCase()}`
      );
    } finally {
      if (fieldKey === "headshotUrl") {
        setIsUploadingAvatar(false);
      } else {
        setIsUploadingBrokerLogo(false);
      }
    }
  };

  const handleImageRemove = async (
    fieldKey: keyof BrandingProfileState,
    fieldName: string
  ) => {
    if (fieldKey === "headshotUrl") {
      setHeadshotUrl("");
      setAvatarPreviewUrl("");
    } else {
      setPersonalLogoUrl("");
      setBrokerLogoPreviewUrl("");
    }

    await persistProfileUpdate(fieldName, "removed", {
      [fieldKey]: ""
    });
  };

  return {
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
    handleSaveAgentInfo
  };
};
