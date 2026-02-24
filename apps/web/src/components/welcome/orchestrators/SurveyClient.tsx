"use client";

import { useRouter } from "next/navigation";
import { SurveyPage } from "../components";
import { mapSurveyFormDataToSurveySubmission } from "../domain";
import { completeCurrentUserWelcomeSurvey } from "@web/src/server/actions/user/commands";
import type { SurveyFormData } from "../shared";

interface SurveyClientProps {
  googleMapsApiKey: string;
}

export const SurveyClient = ({
  googleMapsApiKey
}: SurveyClientProps) => {
  const router = useRouter();

  const handleSubmit = async (data: SurveyFormData) => {
    await completeCurrentUserWelcomeSurvey(
      mapSurveyFormDataToSurveySubmission(data)
    );

    router.push("/");
  };

  return (
    <SurveyPage googleMapsApiKey={googleMapsApiKey} onSubmit={handleSubmit} />
  );
};
