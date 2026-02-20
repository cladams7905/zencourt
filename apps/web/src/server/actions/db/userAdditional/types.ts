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
