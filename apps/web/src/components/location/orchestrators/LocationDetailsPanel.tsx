"use client";

import { Button } from "@web/src/components/ui/button";
import { Input } from "@web/src/components/ui/input";
import { Label } from "@web/src/components/ui/label";
import { ValidationMessages } from "@web/src/components/location/components";
import { useLocationDetailsValidation } from "@web/src/components/location/domain/hooks";

interface LocationDetailsPanelProps {
  suggestedCounty: string;
  suggestedServiceAreas: string[];
  state: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  countyValue: string;
  serviceAreasValue: string;
  onCountyChange: (value: string) => void;
  onServiceAreasChange: (value: string) => void;
  onValidationChange?: (hasErrors: boolean) => void;
}

export const LocationDetailsPanel = ({
  suggestedCounty,
  suggestedServiceAreas,
  state,
  isEditing,
  onToggleEdit,
  countyValue,
  serviceAreasValue,
  onCountyChange,
  onServiceAreasChange,
  onValidationChange
}: LocationDetailsPanelProps) => {
  const {
    knownCountySet,
    normalizedCounty,
    parsedServiceAreas,
    tooManyAreas,
    tooLongAreas,
    hasDuplicates,
    unknownAreas,
    hasUnknownAreas
  } = useLocationDetailsValidation({
    state,
    countyValue,
    serviceAreasValue,
    onValidationChange
  });

  const suggestedServiceAreasText = suggestedServiceAreas.join(", ");

  return (
    <div className="rounded-lg border border-border bg-secondary p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">Suggested details</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-2"
          onClick={onToggleEdit}
        >
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>
      <div className="mt-3 grid gap-3">
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            County
          </Label>
          {isEditing ? (
            <Input
              value={countyValue}
              onChange={(event) => onCountyChange(event.target.value)}
              placeholder="County name"
            />
          ) : (
            <p>{suggestedCounty || "Not found"}</p>
          )}
          {isEditing &&
            countyValue.trim() &&
            knownCountySet &&
            !knownCountySet.has(normalizedCounty) && (
              <p className="text-xs text-destructive">
                County not found in {state} data.
              </p>
            )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Service areas
          </Label>
          {isEditing ? (
            <Input
              value={serviceAreasValue}
              onChange={(event) => onServiceAreasChange(event.target.value)}
              placeholder="City, City, City"
            />
          ) : (
            <p>
              {suggestedServiceAreas.length > 0
                ? suggestedServiceAreasText
                : "Not found"}
            </p>
          )}
          {isEditing && (
            <ValidationMessages
              tooManyAreas={tooManyAreas}
              tooLongAreasCount={tooLongAreas.length}
              hasDuplicates={hasDuplicates}
              hasUnknownAreas={hasUnknownAreas}
              unknownAreas={unknownAreas}
              parsedServiceAreasCount={parsedServiceAreas.length}
              state={state}
            />
          )}
        </div>
      </div>
    </div>
  );
};
