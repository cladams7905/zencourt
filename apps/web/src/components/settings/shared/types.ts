import type { DBUserAdditional } from "@shared/types/models";

export interface SettingsViewProps {
  userId: string;
  userAdditional: DBUserAdditional;
  userEmail: string;
  userName: string;
  defaultAgentName?: string;
  defaultHeadshotUrl?: string;
  paymentPlan: string;
  location?: string;
  googleMapsApiKey: string;
}

export interface AccountTabProps {
  userId: string;
  userEmail: string;
  location: string | null;
  googleMapsApiKey: string;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSave?: (save: () => Promise<void>) => void;
}

export interface BrandingTabProps {
  userId: string;
  userAdditional: DBUserAdditional;
  defaultAgentName?: string;
  defaultHeadshotUrl?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSave?: (save: () => Promise<void>) => void;
  isActive?: boolean;
}

export type SettingsTabId = "account" | "branding" | "subscription";

export type BrandingProfileState = {
  agentName: string;
  brokerageName: string;
  headshotUrl: string;
  personalLogoUrl: string;
  agentBio: string;
};
