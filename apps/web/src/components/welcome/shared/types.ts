import type { ReferralSource, TargetAudience } from "@db/client";
import type { LocationData } from "@web/src/components/location";

export interface SurveyFormData {
  referralSource: ReferralSource;
  referralSourceOther?: string;
  location: LocationData;
  targetAudiences: TargetAudience[];
  weeklyPostingFrequency: number;
}

export interface SurveyPageProps {
  googleMapsApiKey: string;
  onSubmit: (data: SurveyFormData) => Promise<void>;
  className?: string;
}
