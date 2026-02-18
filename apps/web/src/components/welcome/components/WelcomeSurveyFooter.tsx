import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../../ui/button";
import { WELCOME_SURVEY_STEP_COUNT } from "../shared";

type WelcomeSurveyFooterProps = {
  currentStep: number;
  canProceed: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void | Promise<void>;
};

export function WelcomeSurveyFooter({
  currentStep,
  canProceed,
  isValid,
  isSubmitting,
  onPrevious,
  onNext,
  onSubmit
}: WelcomeSurveyFooterProps) {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border ">
      <div className="w-full max-w-2xl mx-auto px-8 lg:px-12 py-6">
        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={onPrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {currentStep < WELCOME_SURVEY_STEP_COUNT - 1 ? (
            <Button
              type="button"
              size="lg"
              onClick={onNext}
              disabled={!canProceed}
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
              onClick={() => {
                void onSubmit();
              }}
              className="gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {isSubmitting ? "Submitting..." : "Get Started"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
