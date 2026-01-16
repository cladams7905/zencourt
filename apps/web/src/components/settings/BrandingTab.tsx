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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  PenTool,
  Users,
  Upload,
  X,
  TrendingUp,
  Home,
  Shield,
  Crown,
  KeyRound,
  Palmtree,
  Briefcase
} from "lucide-react";
import {
  updateUserProfile,
  updateWritingStyle,
  updateTargetAudiences
} from "@web/src/server/actions/db/userAdditional";
import Image from "next/image";
import {
  getSignedDownloadUrl,
  uploadFile
} from "@web/src/server/actions/api/storage";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import type { TargetAudience } from "../welcome/SurveyPage";

interface BrandingTabProps {
  userId: string;
  userAdditional: DBUserAdditional;
}

type BrandingProfileState = {
  agentName: string;
  brokerageName: string;
  avatarImageUrl: string;
  brokerLogoUrl: string;
};

const PRESET_STYLES = [
  {
    value: "professional",
    label: "Professional",
    description: "Polished, formal tone with industry terminology"
  },
  {
    value: "casual",
    label: "Casual",
    description: "Friendly, conversational style with relaxed language"
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, approachable tone that builds rapport"
  },
  {
    value: "enthusiastic",
    label: "Enthusiastic",
    description: "Energetic, upbeat style with exclamation points"
  },
  {
    value: "educational",
    label: "Educational",
    description: "Informative, teaching-focused with clear explanations"
  }
];

const audienceCategories: {
  value: TargetAudience;
  label: string;
  description: string;
  icon: typeof Crown;
}[] = [
  {
    value: "first_time_homebuyers",
    label: "First-Time Homebuyers",
    description: "Mortgage basics, buyer programs, starter homes",
    icon: KeyRound
  },
  {
    value: "growing_families",
    label: "Growing Families",
    description: "School districts, family-friendly neighborhoods",
    icon: Users
  },
  {
    value: "real_estate_investors",
    label: "Real Estate Investors",
    description: "ROI analysis, rental properties, cash flow",
    icon: TrendingUp
  },
  {
    value: "downsizers_retirees",
    label: "Downsizers & Retirees",
    description: "55+ communities, simplified living",
    icon: Home
  },
  {
    value: "luxury_homebuyers",
    label: "Luxury Homebuyers",
    description: "High-end properties, premium amenities",
    icon: Crown
  },
  {
    value: "vacation_property_buyers",
    label: "Vacation Property Buyers",
    description: "Second homes, rental income, resort markets",
    icon: Palmtree
  },
  {
    value: "military_veterans",
    label: "Military & Veterans",
    description: "VA loans, relocation services",
    icon: Shield
  },
  {
    value: "job_transferees",
    label: "Relocators & Job Transferees",
    description: "Corporate relocations, remote moves",
    icon: Briefcase
  }
];

export function BrandingTab({ userId, userAdditional }: BrandingTabProps) {
  const router = useRouter();
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isLoadingStyle, setIsLoadingStyle] = React.useState(false);
  const [isLoadingAudiences, setIsLoadingAudiences] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isUploadingBrokerLogo, setIsUploadingBrokerLogo] =
    React.useState(false);

  // Profile form state
  const [agentName, setAgentName] = React.useState(
    userAdditional.agentName || ""
  );
  const [brokerageName, setBrokerageName] = React.useState(
    userAdditional.brokerageName || ""
  );
  const [avatarImageUrl, setAvatarImageUrl] = React.useState(
    userAdditional.avatarImageUrl || ""
  );
  const [brokerLogoUrl, setBrokerLogoUrl] = React.useState(
    userAdditional.brokerLogoUrl || ""
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState(
    userAdditional.avatarImageUrl || ""
  );
  const [brokerLogoPreviewUrl, setBrokerLogoPreviewUrl] = React.useState(
    userAdditional.brokerLogoUrl || ""
  );
  const savedProfileRef = React.useRef<BrandingProfileState>({
    agentName: userAdditional.agentName || "",
    brokerageName: userAdditional.brokerageName || "",
    avatarImageUrl: userAdditional.avatarImageUrl || "",
    brokerLogoUrl: userAdditional.brokerLogoUrl || ""
  });
  const avatarPreviewRef = React.useRef<string | null>(null);
  const brokerLogoPreviewRef = React.useRef<string | null>(null);

  // Target audiences
  const [targetAudiences, setTargetAudiences] = React.useState<
    TargetAudience[]
  >(() => {
    if (userAdditional.targetAudiences) {
      try {
        return JSON.parse(userAdditional.targetAudiences);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Writing style state
  const [writingStylePreset, setWritingStylePreset] = React.useState(
    userAdditional.writingStylePreset || ""
  );
  const [writingStyleCustom, setWritingStyleCustom] = React.useState(
    userAdditional.writingStyleCustom || ""
  );
  const [writingStyleExamples, setWritingStyleExamples] = React.useState<
    string[]
  >(() => {
    if (userAdditional.writingStyleExamples) {
      try {
        return JSON.parse(userAdditional.writingStyleExamples);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [newExampleUrl, setNewExampleUrl] = React.useState("");
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
      if (!avatarImageUrl) {
        if (isActive) {
          setAvatarPreviewUrl("");
        }
        return;
      }
      if (
        avatarImageUrl.startsWith("blob:") ||
        avatarImageUrl.startsWith("data:")
      ) {
        if (isActive) {
          setAvatarPreviewUrl(avatarImageUrl);
        }
        return;
      }
      try {
        const signed = await getSignedDownloadUrl(avatarImageUrl);
        if (isActive) {
          setAvatarPreviewUrl(signed);
        }
      } catch (error) {
        if (isActive) {
          setAvatarPreviewUrl(avatarImageUrl);
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
  }, [avatarImageUrl]);

  React.useEffect(() => {
    let isActive = true;
    const resolveSignedUrl = async () => {
      if (!brokerLogoUrl) {
        if (isActive) {
          setBrokerLogoPreviewUrl("");
        }
        return;
      }
      if (
        brokerLogoUrl.startsWith("blob:") ||
        brokerLogoUrl.startsWith("data:")
      ) {
        if (isActive) {
          setBrokerLogoPreviewUrl(brokerLogoUrl);
        }
        return;
      }
      try {
        const signed = await getSignedDownloadUrl(brokerLogoUrl);
        if (isActive) {
          setBrokerLogoPreviewUrl(signed);
        }
      } catch (error) {
        if (isActive) {
          setBrokerLogoPreviewUrl(brokerLogoUrl);
        }
        toast.error((error as Error).message || "Failed to load logo preview");
      }
    };
    void resolveSignedUrl();
    return () => {
      isActive = false;
    };
  }, [brokerLogoUrl]);

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
    agentName: overrides.agentName ?? agentName,
    brokerageName: overrides.brokerageName ?? brokerageName,
    avatarImageUrl: overrides.avatarImageUrl ?? avatarImageUrl,
    brokerLogoUrl: overrides.brokerLogoUrl ?? brokerLogoUrl
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
        agentTitle: null,
        avatarImageUrl: nextProfile.avatarImageUrl || null,
        brokerLogoUrl: nextProfile.brokerLogoUrl || null
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

  const handleProfileBlur = async (
    fieldKey: keyof BrandingProfileState,
    fieldName: string,
    fieldValue: string
  ) => {
    if (savedProfileRef.current[fieldKey] === fieldValue) {
      return;
    }
    await persistProfileUpdate(fieldName, fieldValue, {
      [fieldKey]: fieldValue
    });
  };

  const handleImageUpload = async (
    file: File,
    fieldKey: keyof BrandingProfileState,
    fieldName: string
  ) => {
    if (file.size > 1024 * 1024) {
      toast.error(
        fieldKey === "avatarImageUrl"
          ? "Headshot must be smaller than 1 MB."
          : "Logo must be smaller than 1 MB."
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (fieldKey === "avatarImageUrl") {
      setAvatarPreviewUrl(previewUrl);
      setIsUploadingAvatar(true);
    } else {
      setBrokerLogoPreviewUrl(previewUrl);
      setIsUploadingBrokerLogo(true);
    }

    try {
      const uploadedUrl = await uploadFile(file, `user_${userId}/branding`);
      if (fieldKey === "avatarImageUrl") {
        setAvatarImageUrl(uploadedUrl);
        setAvatarPreviewUrl(uploadedUrl);
      } else {
        setBrokerLogoUrl(uploadedUrl);
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
      if (fieldKey === "avatarImageUrl") {
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
    if (fieldKey === "avatarImageUrl") {
      setAvatarImageUrl("");
      setAvatarPreviewUrl("");
    } else {
      setBrokerLogoUrl("");
      setBrokerLogoPreviewUrl("");
    }

    await persistProfileUpdate(fieldName, "removed", {
      [fieldKey]: ""
    });
  };

  const handleSaveWritingStyle = async () => {
    setIsLoadingStyle(true);
    try {
      await updateWritingStyle(userId, {
        writingStylePreset: writingStylePreset || null,
        writingStyleCustom: writingStyleCustom || null,
        writingStyleExamples:
          writingStyleExamples.length > 0
            ? JSON.stringify(writingStyleExamples)
            : null
      });
      toast.success("Writing style updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update writing style");
    } finally {
      setIsLoadingStyle(false);
    }
  };

  const handleAddExample = () => {
    if (newExampleUrl.trim() !== "") {
      setWritingStyleExamples([...writingStyleExamples, newExampleUrl.trim()]);
      setNewExampleUrl("");
    }
  };

  const handleRemoveExample = (index: number) => {
    setWritingStyleExamples(writingStyleExamples.filter((_, i) => i !== index));
  };

  const handleSaveTargetAudiences = async () => {
    setIsLoadingAudiences(true);
    try {
      await updateTargetAudiences(userId, JSON.stringify(targetAudiences));
      toast.success("Target audiences updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to update target audiences"
      );
    } finally {
      setIsLoadingAudiences(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Agent Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Agent Information</CardTitle>
          </div>
          <CardDescription>Manage your visual branding assets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agentName">
                <div className="flex items-center gap-2">Display Name</div>
              </Label>
              <Input
                id="agentName"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                onBlur={() =>
                  handleProfileBlur("agentName", "Agent Name", agentName)
                }
                placeholder="Alex Rivera"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brokerageName">
                <div className="flex items-center gap-2">Brokerage Name</div>
              </Label>
              <Input
                id="brokerageName"
                value={brokerageName}
                onChange={(e) => setBrokerageName(e.target.value)}
                onBlur={() =>
                  handleProfileBlur(
                    "brokerageName",
                    "Brokerage Name",
                    brokerageName
                  )
                }
                placeholder="Zencourt Realty"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="avatarUpload">Professional Headshot</Label>
              <div className="space-y-3">
                <label
                  htmlFor="avatarUpload"
                  className={cn(
                    "flex items-center justify-center rounded-xl border border-dashed border-border p-4 transition-colors h-50",
                    !isUploadingAvatar &&
                      !isSavingProfile &&
                      "cursor-pointer hover:bg-secondary",
                    (isUploadingAvatar || isSavingProfile) &&
                      "cursor-not-allowed opacity-70"
                  )}
                >
                  {avatarPreviewUrl ? (
                    <div className="rounded-lg overflow-hidden border border-border bg-background">
                      <div className="relative mx-auto h-40 w-40">
                        <Image
                          {...getPreviewImageProps(avatarPreviewUrl)}
                          alt="Profile preview"
                          fill
                          className="object-cover"
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
                            void handleImageRemove(
                              "avatarImageUrl",
                              "Headshot"
                            );
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
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    void handleImageUpload(file, "avatarImageUrl", "Headshot");
                    event.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brokerLogoUpload">Personal Logo</Label>
              <div className="space-y-3">
                <label
                  htmlFor="brokerLogoUpload"
                  className={cn(
                    "flex items-center justify-center rounded-xl border border-dashed border-border p-4 transition-colors h-50",
                    !isUploadingBrokerLogo &&
                      !isSavingProfile &&
                      "cursor-pointer hover:bg-secondary",
                    (isUploadingBrokerLogo || isSavingProfile) &&
                      "cursor-not-allowed opacity-70"
                  )}
                >
                  {brokerLogoPreviewUrl ? (
                    <div className="relative inline-flex rounded-lg overflow-hidden border border-border bg-white">
                      <Image
                        {...getPreviewImageProps(brokerLogoPreviewUrl)}
                        alt="Logo preview"
                        width={320}
                        height={120}
                        className="h-auto w-auto max-h-24 max-w-full object-contain"
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
                            "brokerLogoUrl",
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
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    void handleImageUpload(
                      file,
                      "brokerLogoUrl",
                      "Brokerage Logo"
                    );
                    event.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Audiences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Target Audiences</CardTitle>
          </div>
          <CardDescription>
            Select 1-3 primary audiences for content personalization (from your
            welcome survey)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audienceCategories.map((category) => {
              const Icon = category.icon;
              const isSelected = targetAudiences.includes(category.value);
              const isDisabled = !isSelected && targetAudiences.length >= 3;

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
                      : "border-border hover:bg-secondary/50",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 mt-0.5 shrink-0 text-accent-foreground"
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
            Selected {targetAudiences.length} of 3 maximum
          </p>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveTargetAudiences}
              disabled={isLoadingAudiences}
            >
              {isLoadingAudiences ? "Saving..." : "Save Target Audiences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Writing Style */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Writing Style</CardTitle>
          </div>
          <CardDescription>
            Define how AI should write content in your voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Styles */}
          <div className="space-y-3">
            <Label>Choose a Style Preset</Label>
            <RadioGroup
              value={writingStylePreset}
              onValueChange={setWritingStylePreset}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRESET_STYLES.map((style) => (
                  <label
                    key={style.value}
                    className={cn(
                      "relative flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                      writingStylePreset === style.value
                        ? "border-border bg-secondary shadow-sm"
                        : "border-border hover:bg-secondary/50"
                    )}
                  >
                    <RadioGroupItem value={style.value} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-foreground mb-0.5">
                        {style.label}
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">
                        {style.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
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
              placeholder="e.g., I love using emojis and keeping things light. I often use phrases like 'y'all' and 'let's dive in!'"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Writing Examples */}
          <div className="space-y-3">
            <Label>Writing Examples (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Add URLs to screenshots of your social media posts
            </p>

            <div className="flex gap-2">
              <Input
                value={newExampleUrl}
                onChange={(e) => setNewExampleUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddExample();
                  }
                }}
                placeholder="https://example.com/screenshot.png"
              />
              <Button
                type="button"
                onClick={handleAddExample}
                disabled={!newExampleUrl.trim()}
                variant="outline"
                className="gap-2 shrink-0"
              >
                <Upload className="h-4 w-4" />
                Add
              </Button>
            </div>

            {writingStyleExamples.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {writingStyleExamples.map((url, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-border"
                  >
                    <img
                      src={url}
                      alt={`Writing example ${index + 1}`}
                      className="w-full h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExample(index)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveWritingStyle} disabled={isLoadingStyle}>
              {isLoadingStyle ? "Saving..." : "Save Writing Style"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
