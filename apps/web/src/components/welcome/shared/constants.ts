import type { ReferralSource } from "@db/client";

export const REFERRAL_OPTIONS: Array<{ value: ReferralSource; label: string }> = [
  { value: "facebook", label: "Facebook" },
  { value: "google_search", label: "Google Search" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "word_of_mouth", label: "Word of Mouth" },
  { value: "conference", label: "Real Estate Conference/Event" },
  { value: "referral", label: "Referral from a colleague" },
  { value: "online_ad", label: "Online Ad" },
  { value: "other", label: "Other" }
];

export const WELCOME_SURVEY_STEP_COUNT = 5;
