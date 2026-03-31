import type { TargetAudience } from "@db/client";
import { Label } from "../../../ui/label";
import { cn } from "../../../ui/utils";
import { audienceCategories } from "../../../settings/shared";

type WelcomeAudienceStepProps = {
  targetAudiences: TargetAudience[];
  onToggleTargetAudience: (audience: TargetAudience) => void;
  onClearTargetAudiences: () => void;
};

export function WelcomeAudienceStep({
  targetAudiences,
  onToggleTargetAudience,
  onClearTargetAudiences
}: WelcomeAudienceStepProps) {
  return (
    <div className="space-y-6">
      <Label className="flex items-center gap-2 text-xl font-header text-foreground">
        Who is your primary target audience?
      </Label>
      <p className="text-sm text-muted-foreground">
        Select 1-2 audience demographics to personalize your content strategy
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {audienceCategories.map((audience) => {
          const Icon = audience.icon;
          const isSelected = targetAudiences.includes(audience.value);
          const isDisabled = !isSelected && targetAudiences.length >= 2;

          return (
            <button
              key={audience.value}
              type="button"
              onClick={() => onToggleTargetAudience(audience.value)}
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
            onClick={onClearTargetAudiences}
            className="text-muted-foreground hover:text-foreground underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
