"use client";

import { useRouter } from "next/navigation";
import { SurveyPage, type SurveyFormData } from "./SurveyPage";
import {
  completeWelcomeSurvey,
  markWelcomeSurveyCompleted
} from "@web/src/server/actions/db/userAdditional";

interface SurveyClientProps {
  googleMapsApiKey: string;
  userId: string;
}

const formatLocation = (location: SurveyFormData["location"]): string => {
  if (location.formattedAddress) {
    return location.formattedAddress;
  }

  return [location.city, location.state, location.country]
    .filter(Boolean)
    .join(", ");
};

export const SurveyClient = ({
  googleMapsApiKey,
  userId
}: SurveyClientProps) => {
  const router = useRouter();

  const handleSubmit = async (data: SurveyFormData) => {
    await completeWelcomeSurvey(userId, {
      referralSource: data.referralSource,
      referralSourceOther: data.referralSourceOther ?? null,
      location: formatLocation(data.location),
      targetAudiences: JSON.stringify(data.targetAudiences),
      weeklyPostingFrequency: data.weeklyPostingFrequency
    });

    router.push("/");
  };

  const handleSkip = async () => {
    await markWelcomeSurveyCompleted(userId);
    router.push("/");
  };

  return (
    <SurveyPage
      googleMapsApiKey={googleMapsApiKey}
      onSubmit={handleSubmit}
      onSkip={handleSkip}
    />
  );
};
