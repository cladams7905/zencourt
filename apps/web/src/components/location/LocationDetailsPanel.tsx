"use client";

import * as React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  getCityNameSetForState,
  getCountyNameSetForState,
  normalizeCountyName
} from "@web/src/lib/locationHelpers";

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
  const suggestedServiceAreasText = suggestedServiceAreas.join(", ");
  const [knownCitySet, setKnownCitySet] = React.useState<Set<string> | null>(
    null
  );
  const [knownCountySet, setKnownCountySet] = React.useState<Set<string> | null>(
    null
  );
  const parsedServiceAreas = React.useMemo(
    () =>
      serviceAreasValue
        .split(",")
        .map((area) => area.trim())
        .filter(Boolean),
    [serviceAreasValue]
  );
  const normalizedAreas = React.useMemo(
    () => parsedServiceAreas.map((area) => area.toLowerCase()),
    [parsedServiceAreas]
  );
  const normalizedCounty = normalizeCountyName(countyValue).toLowerCase();
  const tooManyAreas = parsedServiceAreas.length > 5;
  const tooLongAreas = parsedServiceAreas.filter((area) => area.length > 40);
  const hasDuplicates =
    normalizedAreas.length > 0 &&
    new Set(normalizedAreas).size !== normalizedAreas.length;
  const countyInvalid =
    normalizedCounty.length > 0 &&
    knownCountySet !== null &&
    !knownCountySet.has(normalizedCounty);

  const unknownAreas = React.useMemo(() => {
    if (!knownCitySet || parsedServiceAreas.length === 0) {
      return [];
    }
    return parsedServiceAreas.filter(
      (area) => !knownCitySet.has(area.toLowerCase())
    );
  }, [knownCitySet, parsedServiceAreas]);
  const hasUnknownAreas = unknownAreas.length > 0;
  const hasErrors =
    tooManyAreas ||
    tooLongAreas.length > 0 ||
    hasDuplicates ||
    countyInvalid ||
    hasUnknownAreas;

  React.useEffect(() => {
    if (!state) {
      setKnownCitySet(null);
      setKnownCountySet(null);
      return;
    }
    let isActive = true;
    Promise.all([getCityNameSetForState(state), getCountyNameSetForState(state)])
      .then(([citySet, countySet]) => {
        if (isActive) {
          setKnownCitySet(citySet);
          setKnownCountySet(countySet);
        }
      })
      .catch(() => {
        if (isActive) {
          setKnownCitySet(null);
          setKnownCountySet(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [state]);

  React.useEffect(() => {
    onValidationChange?.(hasErrors);
  }, [hasErrors, onValidationChange]);

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
            <div className="space-y-1 text-xs">
              {tooManyAreas && (
                <p className="text-destructive text-sm mt-2">
                  Limit service areas to 5 or fewer entries.
                </p>
              )}
              {tooLongAreas.length > 0 && (
                <p className="text-destructive text-sm mt-2">
                  Each service area must be 40 characters or fewer.
                </p>
              )}
              {hasDuplicates && (
                <p className="text-destructive text-sm mt-2">
                  Remove duplicate service area entries.
                </p>
              )}
              {hasUnknownAreas && (
                <p className="text-destructive text-sm mt-2">
                  {unknownAreas.length === parsedServiceAreas.length
                    ? `None of these match known cities in ${state}.`
                    : `Some entries do not match known cities in ${state}: ${unknownAreas
                        .slice(0, 3)
                        .join(", ")}.`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
