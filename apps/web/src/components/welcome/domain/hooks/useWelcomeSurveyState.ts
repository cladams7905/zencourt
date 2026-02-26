import * as React from "react";
import type { ReferralSource, TargetAudience } from "@db/client";
import type { CarouselApi } from "@web/src/components/ui/carousel";
import type { LocationData } from "@web/src/components/location";
import { normalizeCountyName } from "@web/src/lib/domain/location/cityDataset";
import { logger as baseLogger, createChildLogger } from "@shared/utils/logger";
import { toast } from "sonner";
import type { SurveyFormData } from "../../shared";

type UseWelcomeSurveyStateParams = {
  onSubmit: (data: SurveyFormData) => Promise<void>;
};

const logger = createChildLogger(baseLogger, {
  module: "welcome-survey"
});

export function useWelcomeSurveyState({
  onSubmit
}: UseWelcomeSurveyStateParams) {
  const [targetAudiences, setTargetAudiences] = React.useState<
    TargetAudience[]
  >([]);
  const [weeklyPostingFrequency, setWeeklyPostingFrequency] = React.useState(3);
  const [referralSource, setReferralSource] = React.useState<
    ReferralSource | ""
  >("");
  const [referralSourceOther, setReferralSourceOther] = React.useState("");
  const [location, setLocation] = React.useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [api, setApi] = React.useState<CarouselApi>();
  const suggestedCounty = location?.county ?? "";
  const suggestedServiceAreas = React.useMemo(
    () => location?.serviceAreas ?? [],
    [location?.serviceAreas]
  );
  const suggestedServiceAreasText = suggestedServiceAreas.join(", ");
  const [isEditingLocationDetails, setIsEditingLocationDetails] =
    React.useState(false);
  const [countyOverride, setCountyOverride] = React.useState("");
  const [serviceAreasOverride, setServiceAreasOverride] = React.useState("");
  const [locationHasErrors, setLocationHasErrors] = React.useState(false);

  React.useEffect(() => {
    if (!location) {
      setCountyOverride("");
      setServiceAreasOverride("");
      setIsEditingLocationDetails(false);
      return;
    }
    setCountyOverride(suggestedCounty);
    setServiceAreasOverride(suggestedServiceAreasText);
  }, [location, suggestedCounty, suggestedServiceAreasText]);

  React.useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrentStep(api.selectedScrollSnap());
    });
  }, [api]);

  const stepValidation = React.useMemo(
    () => ({
      0: true,
      1: targetAudiences.length >= 1 && targetAudiences.length <= 3,
      2: weeklyPostingFrequency >= 0 && weeklyPostingFrequency <= 7,
      3: !!location && Boolean(location.postalCode) && !locationHasErrors,
      4:
        !!referralSource &&
        (referralSource !== "other" || referralSourceOther.trim().length > 0)
    }),
    [
      targetAudiences,
      weeklyPostingFrequency,
      location,
      referralSource,
      referralSourceOther,
      locationHasErrors
    ]
  );

  const isValid = React.useMemo(() => {
    return Object.values(stepValidation).every((valid) => valid);
  }, [stepValidation]);

  const toggleTargetAudience = React.useCallback((audience: TargetAudience) => {
    setTargetAudiences((prev) => {
      if (prev.includes(audience)) {
        return prev.filter((entry) => entry !== audience);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, audience];
    });
  }, []);

  const handleNext = React.useCallback(() => {
    if (api && stepValidation[currentStep as keyof typeof stepValidation]) {
      api.scrollNext();
    }
  }, [api, currentStep, stepValidation]);

  const handlePrevious = React.useCallback(() => {
    if (api) {
      api.scrollPrev();
    }
  }, [api]);

  const handleToggleLocationDetails = React.useCallback(() => {
    if (isEditingLocationDetails) {
      setCountyOverride(suggestedCounty);
      setServiceAreasOverride(suggestedServiceAreasText);
    }
    setIsEditingLocationDetails((prev) => !prev);
  }, [isEditingLocationDetails, suggestedCounty, suggestedServiceAreasText]);

  const handleSubmit = React.useCallback(
    async (event?: Pick<React.SyntheticEvent, "preventDefault">) => {
      event?.preventDefault();
      if (!isValid || !location) return;

      setIsSubmitting(true);
      try {
        const resolvedCounty = normalizeCountyName(
          countyOverride.trim() || suggestedCounty
        );
        const resolvedServiceAreas = serviceAreasOverride
          .split(",")
          .map((area) => area.trim())
          .filter(Boolean);
        await onSubmit({
          referralSource: referralSource as ReferralSource,
          referralSourceOther:
            referralSource === "other" ? referralSourceOther : undefined,
          location: {
            ...location,
            county: resolvedCounty || location.county,
            serviceAreas:
              resolvedServiceAreas.length > 0
                ? resolvedServiceAreas
                : suggestedServiceAreas
          },
          targetAudiences,
          weeklyPostingFrequency
        });
      } catch (error) {
        logger.error(error, "Survey submission error");
        toast.error("Survey submission error: " + error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      countyOverride,
      isValid,
      location,
      onSubmit,
      referralSource,
      referralSourceOther,
      serviceAreasOverride,
      suggestedCounty,
      suggestedServiceAreas,
      targetAudiences,
      weeklyPostingFrequency
    ]
  );

  return {
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
  };
}
