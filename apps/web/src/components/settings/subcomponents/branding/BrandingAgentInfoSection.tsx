"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../ui/card";
import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import { Button } from "../../../ui/button";
import { Textarea } from "../../../ui/textarea";
import { Upload, X } from "lucide-react";
import { LoadingImage } from "../../../ui/loading-image";
import { cn } from "../../../ui/utils";
import type { BrandingProfileState } from "@web/src/components/settings/shared";

interface BrandingAgentInfoSectionProps {
  agentName: string;
  setAgentName: (value: string) => void;
  brokerageName: string;
  setBrokerageName: (value: string) => void;
  agentTitle: string;
  setAgentTitle: (value: string) => void;
  agentBio: string;
  setAgentBio: (value: string) => void;
  AGENT_BIO_MAX_CHARS: number;
  avatarPreviewUrl: string;
  brokerLogoPreviewUrl: string;
  getPreviewImageProps: (url: string) => { src: string; unoptimized: boolean };
  isUploadingAvatar: boolean;
  isUploadingBrokerLogo: boolean;
  isSavingProfile: boolean;
  handleImageUpload: (
    file: File,
    fieldKey: keyof BrandingProfileState,
    fieldName: string
  ) => Promise<void>;
  handleImageRemove: (
    fieldKey: keyof BrandingProfileState,
    fieldName: string
  ) => Promise<void>;
  isAgentInfoDirty: boolean;
  handleSaveAgentInfo: () => Promise<void>;
}

export function BrandingAgentInfoSection({
  agentName,
  setAgentName,
  brokerageName,
  setBrokerageName,
  agentTitle,
  setAgentTitle,
  agentBio,
  setAgentBio,
  AGENT_BIO_MAX_CHARS,
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
}: BrandingAgentInfoSectionProps) {
  return (
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
                    "cursor-pointer hover:bg-secondary/60",
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
                    "cursor-pointer hover:bg-secondary/60",
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
                        void handleImageRemove("personalLogoUrl", "Brokerage Logo");
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
                  void handleImageUpload(file, "personalLogoUrl", "Brokerage Logo");
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="agentBio">Agent Bio (Optional)</Label>
          <Textarea
            id="agentBio"
            value={agentBio}
            onChange={(e) => setAgentBio(e.target.value)}
            placeholder="Share a short bio to help personalize your content."
            rows={4}
            maxLength={AGENT_BIO_MAX_CHARS}
            className="resize-none"
          />
          <div className="text-xs text-muted-foreground text-right">
            {agentBio.length}/{AGENT_BIO_MAX_CHARS}
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
  );
}
