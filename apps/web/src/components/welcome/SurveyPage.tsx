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
} from "./LocationAutocomplete";
import {
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Lightbulb,
  Calendar,
  Home,
  Wrench,
  Shield,
  Globe,
  Crown,
  KeyRound,
  Building,
  Palmtree,
  Hammer
} from "lucide-react";

export type ReferralSource =
  | "facebook"
  | "google_search"
  | "instagram"
  | "linkedin"
  | "word_of_mouth"
  | "conference"
  | "referral"
  | "online_ad"
  | "other";

export type ContentInterestCategory =
  | "market_trends"
  | "investing"
  | "buyer_seller_tips"
  | "local_events"
  | "lifestyle"
  | "listing_promotion"
  | "repairs_maintenance"
  | "military_relocation"
  | "international"
  | "luxury_properties"
  | "first_time_buyers"
  | "commercial"
  | "vacation_rentals"
  | "property_flipping";

export interface SurveyFormData {
  referralSource: ReferralSource;
  referralSourceOther?: string;
  location: LocationData;
  contentInterests: ContentInterestCategory[];
  weeklyPostingFrequency: number;
}

interface SurveyPageProps {
  googleMapsApiKey: string;
  onSubmit: (data: SurveyFormData) => Promise<void>;
  onSkip?: () => void;
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

const contentCategories: {
  value: ContentInterestCategory;
  label: string;
  description: string;
  icon: typeof TrendingUp;
}[] = [
  {
    value: "market_trends",
    label: "Market Trends",
    description: "Local market updates & forecasts",
    icon: TrendingUp
  },
  {
    value: "investing",
    label: "Investing",
    description: "Investment strategies & ROI tips",
    icon: DollarSign
  },
  {
    value: "buyer_seller_tips",
    label: "Buyer/Seller Tips",
    description: "How-to guides & expert advice",
    icon: Lightbulb
  },
  {
    value: "local_events",
    label: "Local Events",
    description: "Community happenings & neighborhood spotlights",
    icon: Calendar
  },
  {
    value: "lifestyle",
    label: "Lifestyle",
    description: "Home decor, design & living inspiration",
    icon: Home
  },
  {
    value: "repairs_maintenance",
    label: "Repairs & Maintenance",
    description: "Home improvement & DIY tips",
    icon: Wrench
  },
  {
    value: "property_flipping",
    label: "Property Flipping",
    description: "Renovation tips & flipping strategies",
    icon: Hammer
  },
  {
    value: "first_time_buyers",
    label: "First-Time Homebuyers",
    description: "Mortgage basics & buyer programs",
    icon: KeyRound
  },
  {
    value: "vacation_rentals",
    label: "Vacation Rentals",
    description: "Short-term rental & Airbnb strategies",
    icon: Palmtree
  },
  {
    value: "luxury_properties",
    label: "Luxury Properties",
    description: "High-end listings & luxury market insights",
    icon: Crown
  }
];

export const SurveyPage = ({
  googleMapsApiKey,
  onSubmit,
  onSkip,
  className
}: SurveyPageProps) => {
  const [contentInterests, setContentInterests] = React.useState<
    ContentInterestCategory[]
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
      0: contentInterests.length >= 1 && contentInterests.length <= 5,
      1: weeklyPostingFrequency >= 0 && weeklyPostingFrequency <= 7,
      2: !!location,
      3:
        !!referralSource &&
        (referralSource !== "other" || referralSourceOther.trim().length > 0)
    }),
    [
      contentInterests,
      weeklyPostingFrequency,
      location,
      referralSource,
      referralSourceOther
    ]
  );

  // Overall form validation
  const isValid = React.useMemo(() => {
    return Object.values(stepValidation).every((valid) => valid);
  }, [stepValidation]);

  // Handle content interest toggle
  const toggleContentInterest = (category: ContentInterestCategory) => {
    setContentInterests((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      }
      if (prev.length >= 5) {
        return prev; // Max 5 selections
      }
      return [...prev, category];
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
      await onSubmit({
        referralSource: referralSource as ReferralSource,
        referralSourceOther:
          referralSource === "other" ? referralSourceOther : undefined,
        location,
        contentInterests,
        weeklyPostingFrequency
      });
    } catch (error) {
      console.error("Survey submission error:", error);
      // In production, show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("h-screen flex overflow-hidden", className)}>
      {/* Left Panel - Minimal Aesthetic Column */}
      <div className="hidden lg:flex lg:w-1/4 relative bg-linear-to-br from-accent via-white to-accent/20 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-accent/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-secondary/40 rounded-full blur-3xl" />

        {/* Logo Only */}
        <div className="relative z-10 p-8 pl-10">
          <div className="flex items-center gap-3">
            <Image
              src="/zencourt-logo.svg"
              alt="Zencourt"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="text-foreground font-header text-3xl font-semibold tracking-tight">
              zencourt
            </span>
          </div>
        </div>
      </div>

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
              <Progress value={((currentStep + 1) / 4) * 100} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Step {currentStep + 1} of 4
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-8 lg:px-12 py-8">
            {/* Survey Carousel */}
            <form onSubmit={handleSubmit}>
              <Carousel setApi={setApi} className="w-full">
                <CarouselContent>
                  {/* Step 1: Content Interests */}
                  <CarouselItem>
                    <div className="space-y-6">
                      <Label className="flex items-center gap-2 text-xl font-header text-foreground">
                        What types of content would you like to create?
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Select up to 5 categories to receive content
                        recommendations for
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {contentCategories.map((category) => {
                          const Icon = category.icon;
                          const isSelected = contentInterests.includes(
                            category.value
                          );
                          const isDisabled =
                            !isSelected && contentInterests.length >= 5;

                          return (
                            <button
                              key={category.value}
                              type="button"
                              onClick={() =>
                                toggleContentInterest(category.value)
                              }
                              disabled={isDisabled}
                              className={cn(
                                "flex items-start gap-2.5 p-3 rounded-lg border transition-all duration-200 text-left",
                                isSelected
                                  ? "border-accent bg-accent/40 shadow-sm"
                                  : "border-border hover:bg-accent/20 hover:border-accent/10",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Icon className="h-5 w-5 shrink-0 text-accent-foreground mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-foreground mb-0.5">
                                  {category.label}
                                </div>
                                <div className="text-xs text-muted-foreground leading-tight">
                                  {category.description}
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
                            contentInterests.length === 0 && "text-destructive"
                          )}
                        >
                          {contentInterests.length === 0
                            ? "Please select at least 1 category"
                            : `${contentInterests.length} of 5 selected`}
                        </span>
                        {contentInterests.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setContentInterests([])}
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

                        <div
                          className={cn(
                            "p-4 rounded-lg border transition-colors",
                            weeklyPostingFrequency >= 2 &&
                              weeklyPostingFrequency <= 3
                              ? "border-accent/50 bg-accent/5"
                              : "border-border bg-muted/30"
                          )}
                        >
                          <p className="text-sm text-foreground flex items-start gap-2">
                            <span>
                              <strong>Recommendation:</strong> We recommend
                              posting at least 2-3 times per week to increase
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
                        Where are you located?
                      </Label>

                      <LocationAutocomplete
                        value={location}
                        onChange={setLocation}
                        apiKey={googleMapsApiKey}
                        placeholder="Start typing your city..."
                      />
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
                            className="flex items-center space-x-3 px-4 py-3 rounded-lg border border-border hover:bg-accent/5 hover:border-accent/30 transition-all duration-200"
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
                            className="w-full bg-input-background"
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
        <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="w-full max-w-2xl mx-auto px-8 lg:px-12 py-6">
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
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
