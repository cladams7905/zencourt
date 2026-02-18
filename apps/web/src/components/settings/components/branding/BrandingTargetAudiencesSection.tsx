"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../ui/card";
import { Label } from "../../../ui/label";
import { Button } from "../../../ui/button";
import { Textarea } from "../../../ui/textarea";
import { cn } from "../../../ui/utils";
import type { TargetAudience } from "@db/client";
import { audienceCategories } from "@web/src/components/settings/shared";

interface BrandingTargetAudiencesSectionProps {
  targetAudiences: TargetAudience[];
  toggleTargetAudience: (audience: TargetAudience) => void;
  audienceDescription: string;
  setAudienceDescription: (value: string) => void;
  AUDIENCE_DESCRIPTION_MAX_CHARS: number;
  isTargetAudiencesDirty: boolean;
  isLoadingAudiences: boolean;
  handleSaveTargetAudiences: () => Promise<void>;
}

export function BrandingTargetAudiencesSection({
  targetAudiences,
  toggleTargetAudience,
  audienceDescription,
  setAudienceDescription,
  AUDIENCE_DESCRIPTION_MAX_CHARS,
  isTargetAudiencesDirty,
  isLoadingAudiences,
  handleSaveTargetAudiences
}: BrandingTargetAudiencesSectionProps) {
  return (
    <Card id="target-audiences">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Target Audiences</CardTitle>
        </div>
        <CardDescription>
          Select 1-2 primary audiences for content personalization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {audienceCategories.map((category) => {
            const Icon = category.icon;
            const isSelected = targetAudiences.includes(category.value);
            const isDisabled = !isSelected && targetAudiences.length >= 2;

            return (
              <button
                key={category.value}
                onClick={() => !isDisabled && toggleTargetAudience(category.value)}
                disabled={isDisabled}
                className={cn(
                  "flex items-start gap-2.5 p-3 rounded-lg border transition-all duration-200 text-left",
                  isSelected ? "border-border bg-secondary shadow-sm" : "hover:bg-secondary",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Icon
                  className={cn("h-5 w-5 mt-0.5 shrink-0 text-secondary-foreground")}
                />
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

        <p className="text-sm text-muted-foreground">
          Selected {targetAudiences.length} of 2 maximum
        </p>

        <div className="space-y-2">
          <Label htmlFor="audienceDescription">
            Audience Description (Optional)
          </Label>
          <Textarea
            id="audienceDescription"
            value={audienceDescription}
            onChange={(e) => setAudienceDescription(e.target.value)}
            placeholder="Additional notes about your target audience demographic."
            rows={3}
            maxLength={AUDIENCE_DESCRIPTION_MAX_CHARS}
            className="resize-none"
          />
          <div className="text-xs text-muted-foreground text-right">
            {audienceDescription.length}/{AUDIENCE_DESCRIPTION_MAX_CHARS}
          </div>
        </div>

        {isTargetAudiencesDirty && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveTargetAudiences} disabled={isLoadingAudiences}>
              {isLoadingAudiences ? "Saving..." : "Save Target Audiences"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
