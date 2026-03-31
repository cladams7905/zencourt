import type { ReferralSource } from "@db/client";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { RadioGroup, RadioGroupItem } from "../../../ui/radio-group";
import { REFERRAL_OPTIONS } from "../../shared";

type WelcomeReferralStepProps = {
  referralSource: ReferralSource | "";
  onReferralSourceChange: (value: ReferralSource) => void;
  referralSourceOther: string;
  onReferralSourceOtherChange: (value: string) => void;
};

export function WelcomeReferralStep({
  referralSource,
  onReferralSourceChange,
  referralSourceOther,
  onReferralSourceOtherChange
}: WelcomeReferralStepProps) {
  return (
    <div className="space-y-6">
      <Label className="flex items-center gap-2 text-xl font-header font-medium text-foreground">
        How did you hear about us?
      </Label>

      <RadioGroup
        value={referralSource}
        onValueChange={(value) => onReferralSourceChange(value as ReferralSource)}
        className="gap-2"
      >
        {REFERRAL_OPTIONS.map((option) => (
          <div
            key={option.value}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition-all duration-200"
          >
            <RadioGroupItem value={option.value} id={option.value} />
            <Label
              htmlFor={option.value}
              className="flex-1 cursor-pointer text-sm font-normal text-foreground"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {referralSource === "other" && (
        <div className="animate-in slide-in-from-top-2 duration-200 pt-2">
          <Input
            type="text"
            value={referralSourceOther}
            onChange={(event) => onReferralSourceOtherChange(event.target.value)}
            placeholder="Please specify..."
            className="w-full bg-input-background/50"
          />
        </div>
      )}
    </div>
  );
}
