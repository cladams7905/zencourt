import { formatLocationForStorage } from "@web/src/lib/locationHelpers";
import type { SurveyFormData } from "../shared";

export type WelcomeSurveySubmission = {
  referralSource: SurveyFormData["referralSource"];
  referralSourceOther: string | null;
  location: ReturnType<typeof formatLocationForStorage>;
  county: string | null;
  serviceAreas: string[] | null;
  targetAudiences: SurveyFormData["targetAudiences"];
  weeklyPostingFrequency: SurveyFormData["weeklyPostingFrequency"];
};

export function mapSurveyFormDataToSurveySubmission(
  data: SurveyFormData
): WelcomeSurveySubmission {
  return {
    referralSource: data.referralSource,
    referralSourceOther: data.referralSourceOther ?? null,
    location: formatLocationForStorage(data.location),
    county: data.location.county ?? null,
    serviceAreas: data.location.serviceAreas ?? null,
    targetAudiences: data.targetAudiences,
    weeklyPostingFrequency: data.weeklyPostingFrequency
  };
}
