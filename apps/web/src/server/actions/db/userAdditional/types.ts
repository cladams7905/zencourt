import type { InsertDBUserAdditional } from "@db/types/models";

export type LocationDetailsInput = Pick<
  InsertDBUserAdditional,
  "county" | "serviceAreas"
>;

export type WelcomeSurveyUpdates = Pick<
  InsertDBUserAdditional,
  | "referralSource"
  | "referralSourceOther"
  | "location"
  | "county"
  | "serviceAreas"
  | "targetAudiences"
  | "weeklyPostingFrequency"
>;

export type TargetAudienceUpdates = {
  targetAudiences: NonNullable<InsertDBUserAdditional["targetAudiences"]>;
  audienceDescription?: InsertDBUserAdditional["audienceDescription"];
};

export type UserProfileUpdates = Pick<
  InsertDBUserAdditional,
  | "agentName"
  | "brokerageName"
  | "agentTitle"
  | "agentBio"
  | "headshotUrl"
  | "personalLogoUrl"
>;

export type WritingStyleUpdates = Pick<
  InsertDBUserAdditional,
  "writingToneLevel" | "writingStyleCustom"
>;

/** Snapshot of user additional fields used for content generation (no PII beyond what's needed). */
export type UserAdditionalSnapshot = {
  targetAudiences: string[] | null;
  location: string | null;
  writingToneLevel: number | null;
  writingStyleCustom: string | null;
  agentName: string;
  brokerageName: string;
  agentBio: string | null;
  audienceDescription: string | null;
  county: string | null;
  serviceAreas: string[] | null;
};
