import * as React from "react";
import type { ReferralSource, TargetAudience } from "@db/client";
import type { CarouselApi } from "../../ui/carousel";
import { Carousel, CarouselContent, CarouselItem } from "../../ui/carousel";
import type { LocationData } from "../../location";
import {
  WelcomeAudienceStep,
  WelcomeFrequencyStep,
  WelcomeIntroStep,
  WelcomeLocationStep,
  WelcomeReferralStep
} from "./steps";

type WelcomeSurveyCarouselProps = {
  googleMapsApiKey: string;
  currentStep: number;
  onApiChange: (api: CarouselApi) => void;
  targetAudiences: TargetAudience[];
  onToggleTargetAudience: (audience: TargetAudience) => void;
  onClearTargetAudiences: () => void;
  weeklyPostingFrequency: number;
  onWeeklyPostingFrequencyChange: (value: number) => void;
  location: LocationData | null;
  onLocationChange: (value: LocationData | null) => void;
  suggestedCounty: string;
  suggestedServiceAreas: string[];
  isEditingLocationDetails: boolean;
  onToggleLocationDetails: () => void;
  countyOverride: string;
  onCountyChange: (value: string) => void;
  serviceAreasOverride: string;
  onServiceAreasChange: (value: string) => void;
  onLocationValidationChange: (hasErrors: boolean) => void;
  referralSource: ReferralSource | "";
  onReferralSourceChange: (value: ReferralSource) => void;
  referralSourceOther: string;
  onReferralSourceOtherChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function WelcomeSurveyCarousel({
  googleMapsApiKey,
  currentStep,
  onApiChange,
  targetAudiences,
  onToggleTargetAudience,
  onClearTargetAudiences,
  weeklyPostingFrequency,
  onWeeklyPostingFrequencyChange,
  location,
  onLocationChange,
  suggestedCounty,
  suggestedServiceAreas,
  isEditingLocationDetails,
  onToggleLocationDetails,
  countyOverride,
  onCountyChange,
  serviceAreasOverride,
  onServiceAreasChange,
  onLocationValidationChange,
  referralSource,
  onReferralSourceChange,
  referralSourceOther,
  onReferralSourceOtherChange,
  onSubmit
}: WelcomeSurveyCarouselProps) {
  return (
    <div className="flex-1 flex overflow-y-auto items-center">
      <div className="w-full max-w-2xl mx-auto px-8 lg:px-12 py-8">
        <form onSubmit={onSubmit}>
          <Carousel
            setApi={onApiChange}
            className="w-full"
            opts={{ watchDrag: false }}
          >
            <CarouselContent className="px-2">
              <CarouselItem>
                <WelcomeIntroStep />
              </CarouselItem>

              <CarouselItem>
                <WelcomeAudienceStep
                  targetAudiences={targetAudiences}
                  onToggleTargetAudience={onToggleTargetAudience}
                  onClearTargetAudiences={onClearTargetAudiences}
                />
              </CarouselItem>

              <CarouselItem>
                <WelcomeFrequencyStep
                  weeklyPostingFrequency={weeklyPostingFrequency}
                  onWeeklyPostingFrequencyChange={
                    onWeeklyPostingFrequencyChange
                  }
                />
              </CarouselItem>

              <CarouselItem>
                <WelcomeLocationStep
                  googleMapsApiKey={googleMapsApiKey}
                  currentStep={currentStep}
                  location={location}
                  onLocationChange={onLocationChange}
                  suggestedCounty={suggestedCounty}
                  suggestedServiceAreas={suggestedServiceAreas}
                  isEditingLocationDetails={isEditingLocationDetails}
                  onToggleLocationDetails={onToggleLocationDetails}
                  countyOverride={countyOverride}
                  onCountyChange={onCountyChange}
                  serviceAreasOverride={serviceAreasOverride}
                  onServiceAreasChange={onServiceAreasChange}
                  onLocationValidationChange={onLocationValidationChange}
                />
              </CarouselItem>

              <CarouselItem>
                <WelcomeReferralStep
                  referralSource={referralSource}
                  onReferralSourceChange={onReferralSourceChange}
                  referralSourceOther={referralSourceOther}
                  onReferralSourceOtherChange={onReferralSourceOtherChange}
                />
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </form>
      </div>
    </div>
  );
}
