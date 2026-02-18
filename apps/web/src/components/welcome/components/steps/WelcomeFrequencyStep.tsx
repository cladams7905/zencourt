import { Label } from "../../../ui/label";
import { Slider } from "../../../ui/slider";

type WelcomeFrequencyStepProps = {
  weeklyPostingFrequency: number;
  onWeeklyPostingFrequencyChange: (value: number) => void;
};

export function WelcomeFrequencyStep({
  weeklyPostingFrequency,
  onWeeklyPostingFrequencyChange
}: WelcomeFrequencyStepProps) {
  return (
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
            onValueChange={([value]) => onWeeklyPostingFrequencyChange(value)}
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
              <strong>Recommendation:</strong> We recommend posting at least
              3-5 times per week to increase your online brand presence and
              engagement.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
