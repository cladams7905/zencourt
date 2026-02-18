"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { Slider } from "../ui/slider";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi
} from "../ui/carousel";
import {
  LocationAutocomplete,
  type LocationData
} from "../location";
import { LocationDetailsPanel } from "../location";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { ReferralSource, TargetAudience } from "@db/client";
import { audienceCategories } from "../settings/audienceCategories";
import { logger as baseLogger, createChildLogger } from "@web/src/lib/logger";
import { toast } from "sonner";
import { normalizeCountyName } from "@web/src/lib/locationHelpers";

const logger = createChildLogger(baseLogger, {
  module: "welcome-survey"
});

export interface SurveyFormData {
  referralSource: ReferralSource;
  referralSourceOther?: string;
  location: LocationData;
  targetAudiences: TargetAudience[];
  weeklyPostingFrequency: number;
}

interface SurveyPageProps {
  googleMapsApiKey: string;
  onSubmit: (data: SurveyFormData) => Promise<void>;
  className?: string;
}

const referralOptions: { value: ReferralSource; label: string }[] = [
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

export const SurveyPage = ({
  googleMapsApiKey,
  onSubmit,
  className
}: SurveyPageProps) => {
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
  const suggestedServiceAreas = location?.serviceAreas ?? [];
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

  // Sync carousel API with current step
  React.useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrentStep(api.selectedScrollSnap());
    });
  }, [api]);

  // Step validation
  const stepValidation = React.useMemo(
    () => ({
      0: true, // Welcome screen - always valid
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

  // Overall form validation
  const isValid = React.useMemo(() => {
    return Object.values(stepValidation).every((valid) => valid);
  }, [stepValidation]);

  // Handle target audience toggle
  const toggleTargetAudience = (audience: TargetAudience) => {
    setTargetAudiences((prev) => {
      if (prev.includes(audience)) {
        return prev.filter((a) => a !== audience);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 selections
      }
      return [...prev, audience];
    });
  };

  // Navigation handlers
  const handleNext = () => {
    if (api && stepValidation[currentStep as keyof typeof stepValidation]) {
      api.scrollNext();
    }
  };

  const handlePrevious = () => {
    if (api) {
      api.scrollPrev();
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  return (
    <div className={cn("h-screen flex overflow-hidden", className)}>
      {/* Right Panel - Survey Form */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
        {/* Header Section - Full Width */}
        <div className="w-full px-8 lg:px-16 md:pt-12 md:pb-8 border-b">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image
              src="/zencourt-logo.svg"
              alt="Zencourt"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-foreground font-header text-2xl font-semibold tracking-tight">
              zencourt
            </span>
          </div>

          {/* Progress Bar - Centered */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <Progress value={((currentStep + 1) / 5) * 100} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Step {currentStep + 1} of 5
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 flex overflow-y-auto items-center">
          <div className="w-full max-w-2xl mx-auto px-8 lg:px-12 py-8">
            {/* Survey Carousel */}
            <form onSubmit={handleSubmit}>
              <Carousel
                setApi={setApi}
                className="w-full"
                opts={{ watchDrag: false }}
              >
                <CarouselContent className="px-2">
                  {/* Step 0: Welcome Screen */}
                  <CarouselItem>
                    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8 py-12">
                      {/* Animated decorative element */}
                      <div className="relative">
                        <Image
                          src="/zencourt-logo.svg"
                          alt="Zencourt Logo"
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </div>

                      {/* Welcome text */}
                      <div className="space-y-4 text-center max-w-xl">
                        <h1 className="font-header text-5xl md:text-6xl font-bold text-foreground tracking-tight">
                          Welcome to Zencourt
                        </h1>
                        <p className="text-md md:text-lg text-muted-foreground leading-relaxed px-4">
                          Let&apos;s personalize your experience. We&apos;ll ask
                          you a few quick questions to tailor your dashboard and
                          content recommendations to your unique real estate
                          marketing needs.
                        </p>
                      </div>
                    </div>
                  </CarouselItem>

                  {/* Step 1: Target Audiences */}
                  <CarouselItem>
                    <div className="space-y-6">
                      <Label className="flex items-center gap-2 text-xl font-header text-foreground">
                        Who is your primary target audience?
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Select 1-2 audience demographics to personalize your
                        content strategy
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {audienceCategories.map((audience) => {
                          const Icon = audience.icon;
                          const isSelected = targetAudiences.includes(
                            audience.value
                          );
                          const isDisabled =
                            !isSelected && targetAudiences.length >= 2;

                          return (
                            <button
                              key={audience.value}
                              type="button"
                              onClick={() =>
                                toggleTargetAudience(audience.value)
                              }
                              disabled={isDisabled}
                              className={cn(
                                "flex items-start gap-2.5 p-3 rounded-lg border transition-all duration-200 text-left",
                                isSelected
                                  ? "border-border bg-secondary shadow-sm"
                                  : "hover:bg-secondary",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Icon className="h-5 w-5 shrink-0 text-secondary-foreground mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-foreground mb-0.5">
                                  {audience.label}
                                </div>
                                <div className="text-xs text-muted-foreground leading-tight">
                                  {audience.description}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={cn(
                            "text-muted-foreground",
                            targetAudiences.length === 0 && "text-destructive"
                          )}
                        >
                          {targetAudiences.length === 0
                            ? "Please select at least 1 audience"
                            : `${targetAudiences.length} of 2 selected`}
                        </span>
                        {targetAudiences.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setTargetAudiences([])}
                            className="text-muted-foreground hover:text-foreground underline"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                  </CarouselItem>

                  {/* Step 2: Posting Frequency */}
                  <CarouselItem>
                    <div className="space-y-6">
                      <Label className="flex items-center gap-2 text-xl font-header text-foreground">
                        How many times per week do you plan to post content?
                      </Label>

                      <div className="space-y-8 pt-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-center">
                            <span className="text-5xl font-header font-bold text-foreground">
                              {weeklyPostingFrequency}
                            </span>
                            <span className="text-2xl text-muted-foreground ml-2">
                              {weeklyPostingFrequency === 1 ? "post" : "posts"}
                            </span>
                          </div>

                          <Slider
                            value={[weeklyPostingFrequency]}
                            onValueChange={([value]) =>
                              setWeeklyPostingFrequency(value)
                            }
                            max={10}
                            min={1}
                            step={1}
                            className="w-full"
                          />

                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>1 post</span>
                            <span>10 posts</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-lg border bg-secondary border-border">
                          <p className="text-sm text-foreground flex items-start gap-2">
                            <span>
                              <strong>Recommendation:</strong> We recommend
                              posting at least 3-5 times per week to increase
                              your online brand presence and engagement.
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>

                  {/* Step 3: Location */}
                  <CarouselItem>
                    <div className="space-y-6">
                      <Label className="flex items-center gap-2 text-xl font-header font-medium text-foreground">
                        What is your ZIP code?
                      </Label>

                      <LocationAutocomplete
                        value={location}
                        onChange={setLocation}
                        apiKey={googleMapsApiKey}
                        placeholder="Enter your ZIP code"
                        autoFillFromGeolocation={currentStep === 3}
                      />
                      {location && (
                        <LocationDetailsPanel
                          suggestedCounty={suggestedCounty}
                          suggestedServiceAreas={suggestedServiceAreas}
                          state={location?.state ?? ""}
                          isEditing={isEditingLocationDetails}
                          onToggleEdit={() => {
                            if (isEditingLocationDetails) {
                              setCountyOverride(suggestedCounty);
                              setServiceAreasOverride(
                                suggestedServiceAreasText
                              );
                            }
                            setIsEditingLocationDetails(
                              !isEditingLocationDetails
                            );
                          }}
                          countyValue={countyOverride}
                          serviceAreasValue={serviceAreasOverride}
                          onCountyChange={setCountyOverride}
                          onServiceAreasChange={setServiceAreasOverride}
                          onValidationChange={setLocationHasErrors}
                        />
                      )}
                    </div>
                  </CarouselItem>
                  {/* Step 4: Referral Source */}
                  <CarouselItem>
                    <div className="space-y-6">
                      <Label className="flex items-center gap-2 text-xl font-header font-medium text-foreground">
                        How did you hear about us?
                      </Label>

                      <RadioGroup
                        value={referralSource}
                        onValueChange={(value) =>
                          setReferralSource(value as ReferralSource)
                        }
                        className="gap-2"
                      >
                        {referralOptions.map((option) => (
                          <div
                            key={option.value}
                            className="flex items-center space-x-3 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition-all duration-200"
                          >
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                            />
                            <Label
                              htmlFor={option.value}
                              className="flex-1 cursor-pointer text-sm font-normal text-foreground"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>

                      {/* Conditional "Other" input */}
                      {referralSource === "other" && (
                        <div className="animate-in slide-in-from-top-2 duration-200 pt-2">
                          <Input
                            type="text"
                            value={referralSourceOther}
                            onChange={(e) =>
                              setReferralSourceOther(e.target.value)
                            }
                            placeholder="Please specify..."
                            className="w-full bg-input-background/50"
                          />
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                </CarouselContent>
              </Carousel>
            </form>
          </div>
        </div>

        {/* Navigation Controls - Sticky Footer */}
        <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border ">
          <div className="w-full max-w-2xl mx-auto px-8 lg:px-12 py-6">
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleNext}
                  disabled={
                    !stepValidation[currentStep as keyof typeof stepValidation]
                  }
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  disabled={!isValid || isSubmitting}
                  onClick={handleSubmit}
                  className="gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  {isSubmitting ? "Submitting..." : "Get Started"}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
