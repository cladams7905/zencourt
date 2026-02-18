"use client";

import { useRouter } from "next/navigation";
import { SurveyPage } from "../components";
import { mapSurveyFormDataToSurveySubmission } from "../domain";
import { completeWelcomeSurvey } from "@web/src/server/actions/db/userAdditional";
import type { SurveyFormData } from "../shared";

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
    await completeWelcomeSurvey(
      userId,
      mapSurveyFormDataToSurveySubmission(data)
    );

    router.push("/");
  };

  return (
    <SurveyPage googleMapsApiKey={googleMapsApiKey} onSubmit={handleSubmit} />
  );
};
