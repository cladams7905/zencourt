"use client";

import * as React from "react";
import { cn } from "../../ui/utils";
import type { ReferralSource } from "@db/client";
import type { SurveyPageProps } from "../shared";
import { useWelcomeSurveyState } from "../domain";
import { WelcomeSurveyCarousel } from "./WelcomeSurveyCarousel";
import { WelcomeSurveyFooter } from "./WelcomeSurveyFooter";
import { WelcomeSurveyHeader } from "./WelcomeSurveyHeader";

export const SurveyPage = ({
  googleMapsApiKey,
  onSubmit,
  className
}: SurveyPageProps) => {
  const {
    targetAudiences,
    setTargetAudiences,
    weeklyPostingFrequency,
    setWeeklyPostingFrequency,
    referralSource,
    setReferralSource,
    referralSourceOther,
    setReferralSourceOther,
    location,
    setLocation,
    isSubmitting,
    currentStep,
    setApi,
    suggestedCounty,
    suggestedServiceAreas,
    isEditingLocationDetails,
    handleToggleLocationDetails,
    countyOverride,
    setCountyOverride,
    serviceAreasOverride,
    setServiceAreasOverride,
    setLocationHasErrors,
    stepValidation,
    isValid,
    toggleTargetAudience,
    handleNext,
    handlePrevious,
    handleSubmit
  } = useWelcomeSurveyState({ onSubmit });

  const canProceed =
    stepValidation[currentStep as keyof typeof stepValidation] ?? false;

  return (
    <div className={cn("h-screen flex overflow-hidden", className)}>
      <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
        <WelcomeSurveyHeader currentStep={currentStep} />

        <WelcomeSurveyCarousel
          googleMapsApiKey={googleMapsApiKey}
          currentStep={currentStep}
          onApiChange={(api) => setApi(api)}
          targetAudiences={targetAudiences}
          onToggleTargetAudience={toggleTargetAudience}
          onClearTargetAudiences={() => setTargetAudiences([])}
          weeklyPostingFrequency={weeklyPostingFrequency}
          onWeeklyPostingFrequencyChange={setWeeklyPostingFrequency}
          location={location}
          onLocationChange={setLocation}
          suggestedCounty={suggestedCounty}
          suggestedServiceAreas={suggestedServiceAreas}
          isEditingLocationDetails={isEditingLocationDetails}
          onToggleLocationDetails={handleToggleLocationDetails}
          countyOverride={countyOverride}
          onCountyChange={setCountyOverride}
          serviceAreasOverride={serviceAreasOverride}
          onServiceAreasChange={setServiceAreasOverride}
          onLocationValidationChange={setLocationHasErrors}
          referralSource={referralSource}
          onReferralSourceChange={(value) =>
            setReferralSource(value as ReferralSource)
          }
          referralSourceOther={referralSourceOther}
          onReferralSourceOtherChange={setReferralSourceOther}
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        />

        <WelcomeSurveyFooter
          currentStep={currentStep}
          canProceed={canProceed}
          isValid={isValid}
          isSubmitting={isSubmitting}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={() => handleSubmit()}
        />
      </div>
    </div>
  );
};
