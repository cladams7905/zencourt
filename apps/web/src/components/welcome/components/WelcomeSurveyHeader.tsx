import { Progress } from "../../ui/progress";
import { ZencourtLogo } from "../../ui/zencourt-logo";
import { WELCOME_SURVEY_STEP_COUNT } from "../shared";

type WelcomeSurveyHeaderProps = {
  currentStep: number;
};

export function WelcomeSurveyHeader({ currentStep }: WelcomeSurveyHeaderProps) {
  return (
    <div className="w-full px-8 lg:px-16 md:pt-12 md:pb-8 border-b">
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <ZencourtLogo
          alt="Zencourt"
          width={28}
          height={28}
          className="object-contain"
        />
        <span className="text-foreground font-header text-2xl font-semibold tracking-tight">
          zencourt
        </span>
      </div>

      <div className="flex items-center justify-center">
        <div className="w-full max-w-md">
          <Progress
            value={((currentStep + 1) / WELCOME_SURVEY_STEP_COUNT) * 100}
            className="h-2"
          />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Step {currentStep + 1} of {WELCOME_SURVEY_STEP_COUNT}
          </p>
        </div>
      </div>
    </div>
  );
}
