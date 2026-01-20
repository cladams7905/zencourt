"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { DBUserAdditional } from "@shared/types/models";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Slider } from "../ui/slider";
import { Upload, X } from "lucide-react";
import {
  ensureGoogleHeadshot,
  markWritingStyleCompleted,
  updateUserProfile,
  updateWritingStyle,
  updateTargetAudiences
} from "@web/src/server/actions/db/userAdditional";
import { LoadingImage } from "../ui/loading-image";
import {
  getSignedDownloadUrl,
  uploadFile
} from "@web/src/server/actions/api/storage";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import type { TargetAudience } from "@db/client";
import { audienceCategories } from "./audienceCategories";

interface BrandingTabProps {
  userId: string;
  userAdditional: DBUserAdditional;
  defaultAgentName?: string;
  defaultHeadshotUrl?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSave?: (save: () => Promise<void>) => void;
  isActive?: boolean;
}

type BrandingProfileState = {
  agentName: string;
  brokerageName: string;
  headshotUrl: string;
  personalLogoUrl: string;
};

const TONE_SCALE = [
  {
    value: 1,
    label: "Very informal",
    description: "Texting lingo, playful, highly conversational",
    example:
      "ngl this kitchen is literally chef's kiss 👨‍🍳✨ the light hits just right and the vibes are immaculate. hmu if you wanna check it out"
  },
  {
    value: 2,
    label: "Informal",
    description: "Warm, casual, approachable voice",
    example:
      "This home has THAT energy—gorgeous natural light, a kitchen you'll want to spend all day in, and a backyard perfect for weekend hangouts. Come check it out!"
  },
  {
    value: 3,
    label: "Conversational",
    description: "Casual-professional, friendly, clear and concise",
    example:
      "Beautiful home with updated finishes, excellent natural lighting, and a functional floor plan that just works. I'd love to walk you through it, let's set up a time!"
  },
  {
    value: 4,
    label: "Formal",
    description: "Polished, authoritative, minimal slang",
    example:
      "This residence showcases quality construction and thoughtful design, featuring updated systems and an open floor plan. Contact us to arrange a private showing."
  },
  {
    value: 5,
    label: "Very formal",
    description: "Professional, structured, elevated tone",
    example:
      "This property presents superior craftsmanship, contemporary renovations, and harmonious spatial planning. We invite qualified inquiries."
  }
];

const coerceToneValue = (preset: number | string | null): number => {
  if (preset === null || preset === undefined || preset === "") {
    return 3;
  }
  const numeric = Number(preset);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 5) {
    return numeric;
  }
  return 3;
};

export function BrandingTab({
  userId,
  userAdditional,
  defaultAgentName,
  defaultHeadshotUrl,
  onDirtyChange,
  onRegisterSave,
  isActive = true
}: BrandingTabProps) {
  const router = useRouter();
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isLoadingStyle, setIsLoadingStyle] = React.useState(false);
  const [isLoadingAudiences, setIsLoadingAudiences] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isUploadingBrokerLogo, setIsUploadingBrokerLogo] =
    React.useState(false);

  // Profile form state
  const initialAgentName = userAdditional.agentName || defaultAgentName || "";
  const initialHeadshotUrl = userAdditional.headshotUrl || "";
  const [agentName, setAgentName] = React.useState(initialAgentName);
  const [brokerageName, setBrokerageName] = React.useState(
    userAdditional.brokerageName || ""
  );
  const [agentTitle, setAgentTitle] = React.useState(
    userAdditional.agentTitle || ""
  );
  const [headshotUrl, setheadshotUrl] = React.useState(initialHeadshotUrl);
  const [personalLogoUrl, setpersonalLogoUrl] = React.useState(
    userAdditional.personalLogoUrl || ""
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] =
    React.useState(initialHeadshotUrl);
  const [brokerLogoPreviewUrl, setBrokerLogoPreviewUrl] = React.useState(
    userAdditional.personalLogoUrl || ""
  );
  const savedProfileRef = React.useRef<BrandingProfileState>({
    agentName: initialAgentName,
    brokerageName: userAdditional.brokerageName || "",
    headshotUrl: initialHeadshotUrl,
    personalLogoUrl: userAdditional.personalLogoUrl || ""
  });
  const avatarPreviewRef = React.useRef<string | null>(null);
  const brokerLogoPreviewRef = React.useRef<string | null>(null);

  // Target audiences
  const [targetAudiences, setTargetAudiences] = React.useState<
    TargetAudience[]
  >(() => {
    return userAdditional.targetAudiences ?? [];
  });
  const [initialTargetAudiences, setInitialTargetAudiences] = React.useState<
    TargetAudience[]
  >(() => {
    return userAdditional.targetAudiences ?? [];
  });

  // Writing style state
  const [writingToneLevel, setwritingToneLevel] = React.useState<number>(
    coerceToneValue(userAdditional.writingToneLevel)
  );
  const [writingStyleCustom, setWritingStyleCustom] = React.useState(
    userAdditional.writingStyleCustom || ""
  );
  const [initialWritingStyle, setInitialWritingStyle] = React.useState(() => ({
    preset: coerceToneValue(userAdditional.writingToneLevel),
    custom: userAdditional.writingStyleCustom || ""
  }));
  const [initialAgentInfo, setInitialAgentInfo] = React.useState(() => ({
    agentName: initialAgentName,
    brokerageName: userAdditional.brokerageName || "",
    agentTitle: userAdditional.agentTitle || ""
  }));
  const [hasMarkedWritingStyle, setHasMarkedWritingStyle] = React.useState(
    Boolean(userAdditional.writingStyleCompletedAt)
  );
  const writingStyleSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const getPreviewImageProps = React.useCallback((url: string) => {
    if (!url) {
      return { src: "", unoptimized: false };
    }
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      return { src: url, unoptimized: true };
    }
    return {
      src: url,
      unoptimized: true
    };
  }, []);

  React.useEffect(() => {
    let isActive = true;
    const resolveSignedUrl = async () => {
      if (!headshotUrl) {
        if (isActive) {
          setAvatarPreviewUrl("");
        }
        return;
      }
      if (headshotUrl.startsWith("blob:") || headshotUrl.startsWith("data:")) {
        if (isActive) {
          setAvatarPreviewUrl(headshotUrl);
        }
        return;
      }
      try {
        const signed = await getSignedDownloadUrl(headshotUrl);
        if (isActive) {
          setAvatarPreviewUrl(signed);
        }
      } catch (error) {
        if (isActive) {
          setAvatarPreviewUrl(headshotUrl);
        }
        toast.error(
          (error as Error).message || "Failed to load headshot preview"
        );
      }
    };
    void resolveSignedUrl();
    return () => {
      isActive = false;
    };
  }, [headshotUrl]);

  React.useEffect(() => {
    let isActive = true;
    const resolveSignedUrl = async () => {
      if (!personalLogoUrl) {
        if (isActive) {
          setBrokerLogoPreviewUrl("");
        }
        return;
      }
      if (
        personalLogoUrl.startsWith("blob:") ||
        personalLogoUrl.startsWith("data:")
      ) {
        if (isActive) {
          setBrokerLogoPreviewUrl(personalLogoUrl);
        }
        return;
      }
      try {
        const signed = await getSignedDownloadUrl(personalLogoUrl);
        if (isActive) {
          setBrokerLogoPreviewUrl(signed);
        }
      } catch (error) {
        if (isActive) {
          setBrokerLogoPreviewUrl(personalLogoUrl);
        }
        toast.error((error as Error).message || "Failed to load logo preview");
      }
    };
    void resolveSignedUrl();
    return () => {
      isActive = false;
    };
  }, [personalLogoUrl]);

  const hasSeededHeadshotRef = React.useRef(false);
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
        setheadshotUrl(url);
        setAvatarPreviewUrl(url);
        savedProfileRef.current = {
          ...savedProfileRef.current,
          headshotUrl: url
        };
      })
      .catch((error) => {
        toast.error(
          (error as Error).message || "Failed to save Google headshot"
        );
      })
      .finally(() => {
        setIsUploadingAvatar(false);
      });
  }, [defaultHeadshotUrl, headshotUrl, userId]);

  const toggleTargetAudience = (audience: TargetAudience) => {
    setTargetAudiences((prev) => {
      if (prev.includes(audience)) {
        return prev.filter((a) => a !== audience);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 selections
      }
      return [...prev, audience];
    });
  };

  const isAgentInfoDirty = React.useMemo(() => {
    return (
      (agentName || "") !== (initialAgentInfo.agentName || "") ||
      (brokerageName || "") !== (initialAgentInfo.brokerageName || "") ||
      (agentTitle || "") !== (initialAgentInfo.agentTitle || "")
    );
  }, [agentName, brokerageName, agentTitle, initialAgentInfo]);

  const isTargetAudiencesDirty = React.useMemo(() => {
    const initial = [...initialTargetAudiences].sort();
    const current = [...targetAudiences].sort();
    if (initial.length !== current.length) {
      return true;
    }
    return initial.some((value, index) => value !== current[index]);
  }, [initialTargetAudiences, targetAudiences]);

  const isWritingStyleDirty = React.useMemo(() => {
    const initial = initialWritingStyle;
    if (initial.preset !== writingToneLevel) {
      return true;
    }
    if ((initial.custom || "") !== (writingStyleCustom || "")) {
      return true;
    }
    return false;
  }, [writingToneLevel, writingStyleCustom, initialWritingStyle]);

  const toneValue = React.useMemo(
    () => coerceToneValue(writingToneLevel),
    [writingToneLevel]
  );
  const toneMeta =
    TONE_SCALE.find((tone) => tone.value === toneValue) ?? TONE_SCALE[2];

  const hasUnsavedChanges = React.useMemo(() => {
    return isAgentInfoDirty || isTargetAudiencesDirty || isWritingStyleDirty;
  }, [isAgentInfoDirty, isTargetAudiencesDirty, isWritingStyleDirty]);

  React.useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  React.useEffect(() => {
    if (
      avatarPreviewRef.current &&
      avatarPreviewRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(avatarPreviewRef.current);
    }
    avatarPreviewRef.current = avatarPreviewUrl || null;
  }, [avatarPreviewUrl]);

  React.useEffect(() => {
    if (
      brokerLogoPreviewRef.current &&
      brokerLogoPreviewRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(brokerLogoPreviewRef.current);
    }
    brokerLogoPreviewRef.current = brokerLogoPreviewUrl || null;
  }, [brokerLogoPreviewUrl]);

  React.useEffect(() => {
    if (!isActive || hasMarkedWritingStyle) {
      return;
    }
    const sentinel = writingStyleSentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }
        setHasMarkedWritingStyle(true);
        void markWritingStyleCompleted(userId);
        observer.disconnect();
      },
      { threshold: 0.2 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMarkedWritingStyle, isActive, userId]);

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
    brokerageName:
      overrides.brokerageName ?? savedProfileRef.current.brokerageName,
    headshotUrl: overrides.headshotUrl ?? headshotUrl,
    personalLogoUrl: overrides.personalLogoUrl ?? personalLogoUrl
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
        headshotUrl: nextProfile.headshotUrl || null,
        personalLogoUrl: nextProfile.personalLogoUrl || null
      });
      savedProfileRef.current = nextProfile;
      toast.success(`successfuly updated ${fieldName} to ${displayValue}.`);
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
      await updateUserProfile(userId, {
        agentName,
        brokerageName,
        agentTitle: agentTitle || null,
        headshotUrl: savedProfileRef.current.headshotUrl || null,
        personalLogoUrl: savedProfileRef.current.personalLogoUrl || null
      });
      savedProfileRef.current = {
        ...savedProfileRef.current,
        agentName,
        brokerageName
      };
      setInitialAgentInfo({ agentName, brokerageName, agentTitle });
      toast.success("Agent information updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update agent profile");
    } finally {
      setIsSavingProfile(false);
    }
  }, [agentName, agentTitle, brokerageName, router, userId]);

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
        setheadshotUrl(uploadedUrl);
        setAvatarPreviewUrl(uploadedUrl);
      } else {
        setpersonalLogoUrl(uploadedUrl);
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
      setheadshotUrl("");
      setAvatarPreviewUrl("");
    } else {
      setpersonalLogoUrl("");
      setBrokerLogoPreviewUrl("");
    }

    await persistProfileUpdate(fieldName, "removed", {
      [fieldKey]: ""
    });
  };

  const handleSaveWritingStyle = React.useCallback(async () => {
    setIsLoadingStyle(true);
    try {
      await updateWritingStyle(userId, {
        writingToneLevel: writingToneLevel ?? null,
        writingStyleCustom: writingStyleCustom || null
      });
      setInitialWritingStyle({
        preset: writingToneLevel,
        custom: writingStyleCustom || ""
      });
      toast.success("Writing style updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update writing style");
    } finally {
      setIsLoadingStyle(false);
    }
  }, [router, userId, writingToneLevel, writingStyleCustom]);

  const handleSaveTargetAudiences = React.useCallback(async () => {
    setIsLoadingAudiences(true);
    try {
      await updateTargetAudiences(userId, targetAudiences);
      setInitialTargetAudiences([...targetAudiences]);
      toast.success("Target audiences updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to update target audiences"
      );
    } finally {
      setIsLoadingAudiences(false);
    }
  }, [router, targetAudiences, userId]);

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
    handleSaveAgentInfo,
    handleSaveTargetAudiences,
    handleSaveWritingStyle,
    isAgentInfoDirty,
    isTargetAudiencesDirty,
    isWritingStyleDirty
  ]);

  React.useEffect(() => {
    onRegisterSave?.(handleSaveAllChanges);
  }, [handleSaveAllChanges, onRegisterSave]);

  return (
    <div className="grid gap-6">
      {/* Agent Branding */}
      <Card id="profile">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Agent Information</CardTitle>
          </div>
          <CardDescription>Manage your visual branding assets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 min-w-0 overflow-hidden">
          <div className="grid gap-4 md:grid-cols-2 min-w-0">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="agentName">
                <div className="flex items-center gap-2">Display Name</div>
              </Label>
              <Input
                id="agentName"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Alex Rivera"
              />
            </div>

            <div className="space-y-2 min-w-0">
              <Label htmlFor="brokerageName">
                <div className="flex items-center gap-2">Brokerage Name</div>
              </Label>
              <Input
                id="brokerageName"
                value={brokerageName}
                onChange={(e) => setBrokerageName(e.target.value)}
                placeholder="Zencourt Realty"
              />
            </div>

            <div className="space-y-2 min-w-0">
              <Label htmlFor="agentTitle">
                <div className="flex items-center gap-2">Title (Optional)</div>
              </Label>
              <Input
                id="agentTitle"
                value={agentTitle}
                onChange={(e) => setAgentTitle(e.target.value)}
                placeholder="Realtor, Broker, etc."
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="avatarUpload">Professional Headshot</Label>
              <div className="space-y-3">
                <label
                  htmlFor="avatarUpload"
                  className={cn(
                    "flex w-full min-w-0 items-center justify-center rounded-lg border border-dashed border-border p-4 transition-colors h-50",
                    !isUploadingAvatar &&
                      !isSavingProfile &&
                      "cursor-pointer hover:bg-secondary",
                    (isUploadingAvatar || isSavingProfile) &&
                      "cursor-not-allowed opacity-70"
                  )}
                >
                  {avatarPreviewUrl ? (
                    <div className="max-w-full rounded-lg overflow-hidden border border-border bg-background">
                      <div
                        className={cn(
                          "relative mx-auto",
                          avatarPreviewUrl.includes("google-headshot")
                            ? "h-24 w-24"
                            : "h-40 w-40"
                        )}
                      >
                        <LoadingImage
                          {...getPreviewImageProps(avatarPreviewUrl)}
                          alt="Profile preview"
                          fill
                          className="object-cover transition duration-300"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-7 w-7 bg-background/70 backdrop-blur-sm hover:bg-background rounded-full cursor-pointer"
                          disabled={isUploadingAvatar || isSavingProfile}
                          aria-label="Remove headshot"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleImageRemove("headshotUrl", "Headshot");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-6 w-6" />
                      <span className="text-sm">Upload headshot</span>
                    </div>
                  )}
                </label>
                <p className="text-xs text-muted-foreground">
                  Max 1 MB. Recommended 320x320.
                </p>
                <Input
                  id="avatarUpload"
                  type="file"
                  accept="image/*"
                  disabled={isUploadingAvatar || isSavingProfile}
                  className="sr-only w-0"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    void handleImageUpload(file, "headshotUrl", "Headshot");
                    event.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="space-y-2 min-w-0">
              <Label htmlFor="brokerLogoUpload">Personal Logo</Label>
              <div className="space-y-3">
                <label
                  htmlFor="brokerLogoUpload"
                  className={cn(
                    "inline-flex w-full min-w-0 items-center justify-center rounded-lg border border-dashed border-border p-4 transition-colors h-50",
                    !isUploadingBrokerLogo &&
                      !isSavingProfile &&
                      "cursor-pointer hover:bg-secondary",
                    (isUploadingBrokerLogo || isSavingProfile) &&
                      "cursor-not-allowed opacity-70"
                  )}
                >
                  {brokerLogoPreviewUrl ? (
                    <div className="relative inline-flex max-w-full rounded-lg overflow-hidden border border-border bg-white">
                      <LoadingImage
                        {...getPreviewImageProps(brokerLogoPreviewUrl)}
                        alt="Logo preview"
                        width={320}
                        height={120}
                        className="h-auto w-auto max-h-24 max-w-full object-contain transition duration-300"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 bg-background/70 backdrop-blur-sm hover:bg-background rounded-full cursor-pointer"
                        disabled={isUploadingBrokerLogo || isSavingProfile}
                        aria-label="Remove logo"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleImageRemove(
                            "personalLogoUrl",
                            "Brokerage Logo"
                          );
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-6 w-6" />
                      <span className="text-sm">Upload logo</span>
                    </div>
                  )}
                </label>
                <p className="text-xs text-muted-foreground">
                  Max 1 MB. Recommended 800x300 (or 600x225).
                </p>
                <Input
                  id="brokerLogoUpload"
                  type="file"
                  accept="image/*"
                  disabled={isUploadingBrokerLogo || isSavingProfile}
                  className="sr-only w-0"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    void handleImageUpload(
                      file,
                      "personalLogoUrl",
                      "Brokerage Logo"
                    );
                    event.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
          {isAgentInfoDirty && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveAgentInfo} disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Agent Information"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Audiences */}
      <Card id="target-audiences">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Target Audiences</CardTitle>
          </div>
          <CardDescription>
            Select 1-2 primary audiences for content personalization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audienceCategories.map((category) => {
              const Icon = category.icon;
              const isSelected = targetAudiences.includes(category.value);
              const isDisabled = !isSelected && targetAudiences.length >= 2;

              return (
                <button
                  key={category.value}
                  onClick={() =>
                    !isDisabled && toggleTargetAudience(category.value)
                  }
                  disabled={isDisabled}
                  className={cn(
                    "flex items-start gap-2.5 p-3 rounded-lg border transition-all duration-200 text-left",
                    isSelected
                      ? "border-border bg-secondary shadow-sm"
                      : "hover:bg-secondary",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 mt-0.5 shrink-0 text-secondary-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground mb-0.5">
                      {category.label}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {category.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            Selected {targetAudiences.length} of 2 maximum
          </p>

          {isTargetAudiencesDirty && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveTargetAudiences}
                disabled={isLoadingAudiences}
              >
                {isLoadingAudiences ? "Saving..." : "Save Target Audiences"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Writing Style */}
      <Card id="writing-style">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Writing Style</CardTitle>
          </div>
          <CardDescription>
            Define how AI should write content in your voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tone Scale */}
          <div className="space-y-3">
            <Label>Writing Tone</Label>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">
                  {toneMeta.label}
                </span>
                <span className="text-muted-foreground">{toneValue}/5</span>
              </div>
              <div className="mt-3">
                <Slider
                  value={[toneValue]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={([value]) => setwritingToneLevel(value)}
                  className="w-full"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Informal</span>
                <span>Formal</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {toneMeta.description}
              </p>
              <div className="mt-3 rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-xs text-muted-foreground italic">
                &quot;{toneMeta.example}&quot;
              </div>
            </div>
          </div>

          {/* Custom Description */}
          <div className="space-y-2">
            <Label htmlFor="customDescription">
              Additional Style Notes (Optional)
            </Label>
            <Textarea
              id="customDescription"
              value={writingStyleCustom}
              onChange={(e) => setWritingStyleCustom(e.target.value)}
              placeholder="e.g., I often use phrases like 'y'all' and 'howdy'."
              rows={3}
              className="resize-none"
            />
          </div>

          {isWritingStyleDirty && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveWritingStyle}
                disabled={isLoadingStyle}
              >
                {isLoadingStyle ? "Saving..." : "Save Writing Style"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div id="media" ref={writingStyleSentinelRef} className="h-px" />
    </div>
  );
}
