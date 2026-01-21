"use client";

import { useRouter } from "next/navigation";
import { SurveyPage, type SurveyFormData } from "./SurveyPage";
import { completeWelcomeSurvey } from "@web/src/server/actions/db/userAdditional";
import { formatLocationForStorage } from "@web/src/lib/location";

interface SurveyClientProps {
  googleMapsApiKey: string;
  userId: string;
}

export const SurveyClient = ({
  googleMapsApiKey,
  userId
}: SurveyClientProps) => {
  const router = useRouter();

  const handleSubmit = async (data: SurveyFormData) => {
    await completeWelcomeSurvey(userId, {
      referralSource: data.referralSource,
      referralSourceOther: data.referralSourceOther ?? null,
      location: formatLocationForStorage(data.location),
      county: data.location.county ?? null,
      serviceAreas: data.location.serviceAreas ?? null,
      targetAudiences: data.targetAudiences,
      weeklyPostingFrequency: data.weeklyPostingFrequency
    });

    router.push("/");
  };

  return (
    <SurveyPage googleMapsApiKey={googleMapsApiKey} onSubmit={handleSubmit} />
  );
};
