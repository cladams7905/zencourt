"use client";

import { useRouter } from "next/navigation";
import { SurveyPage, type SurveyFormData } from "./SurveyPage";
import { completeWelcomeSurvey } from "@web/src/server/actions/db/userAdditional";

interface SurveyClientProps {
  googleMapsApiKey: string;
  userId: string;
}

const formatLocation = (location: SurveyFormData["location"]): string => {
  if (location.country === "United States") {
    const stateAndZip = [location.state, location.postalCode]
      .filter(Boolean)
      .join(" ");
    return [location.city, stateAndZip].filter(Boolean).join(", ");
  }

  return [location.city, location.country].filter(Boolean).join(", ");
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
      targetAudiences: data.targetAudiences,
      weeklyPostingFrequency: data.weeklyPostingFrequency
    });

    router.push("/");
  };

  return (
    <SurveyPage googleMapsApiKey={googleMapsApiKey} onSubmit={handleSubmit} />
  );
};
