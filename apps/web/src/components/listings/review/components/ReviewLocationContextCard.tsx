import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@web/src/components/ui/card";
import { Input } from "@web/src/components/ui/input";
import { Label } from "@web/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@web/src/components/ui/select";
import { STATE_OPTIONS } from "@web/src/components/listings/review/shared/constants";
import { toNullableString } from "@web/src/components/listings/review/shared/formatters";
import type { ListingPropertyDetails } from "@shared/types/models";
import type {
  SelectMode,
  UpdateReviewSection
} from "@web/src/components/listings/review/shared/types";

type ReviewLocationContextCardProps = {
  locationContext: NonNullable<ListingPropertyDetails["location_context"]>;
  lotTypeMode: SelectMode;
  setLotTypeMode: React.Dispatch<React.SetStateAction<SelectMode>>;
  lotTypeCustom: string;
  setLotTypeCustom: React.Dispatch<React.SetStateAction<string>>;
  lotTypeOptions: string[];
  streetTypeMode: SelectMode;
  setStreetTypeMode: React.Dispatch<React.SetStateAction<SelectMode>>;
  streetTypeCustom: string;
  setStreetTypeCustom: React.Dispatch<React.SetStateAction<string>>;
  streetTypeOptions: string[];
  updateSection: UpdateReviewSection;
  triggerAutoSave: () => void;
};

export const ReviewLocationContextCard = ({
  locationContext,
  lotTypeMode,
  setLotTypeMode,
  lotTypeCustom,
  setLotTypeCustom,
  lotTypeOptions,
  streetTypeMode,
  setStreetTypeMode,
  streetTypeCustom,
  setStreetTypeCustom,
  streetTypeOptions,
  updateSection,
  triggerAutoSave
}: ReviewLocationContextCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Location context</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Subdivision</Label>
          <Input
            value={locationContext.subdivision ?? ""}
            onChange={(event) =>
              updateSection("location_context", (prev) => ({
                ...prev,
                subdivision: toNullableString(event.target.value)
              }))
            }
            onBlur={triggerAutoSave}
          />
        </div>
        <div className="space-y-2">
          <Label>Lot type</Label>
          <Select
            value={lotTypeMode === "custom" ? "Custom" : (locationContext.lot_type ?? "")}
            onValueChange={(value) => {
              if (value === "Custom") {
                setLotTypeMode("custom");
                const next = lotTypeCustom.trim().slice(0, 20);
                updateSection("location_context", (prev) => ({
                  ...prev,
                  lot_type: next || null
                }));
              } else {
                setLotTypeMode("preset");
                setLotTypeCustom(value);
                updateSection("location_context", (prev) => ({
                  ...prev,
                  lot_type: value || null
                }));
              }
              triggerAutoSave();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a lot type" />
            </SelectTrigger>
            <SelectContent>
              {lotTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {lotTypeMode === "custom" ? (
            <Input
              value={lotTypeCustom}
              onChange={(event) => {
                const next = event.target.value.slice(0, 20);
                setLotTypeCustom(next);
                updateSection("location_context", (prev) => ({
                  ...prev,
                  lot_type: next.trim() || null
                }));
              }}
              onBlur={triggerAutoSave}
              maxLength={20}
              placeholder="Custom (20 char max)"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Street type</Label>
          <Select
            value={streetTypeMode === "custom" ? "Custom" : (locationContext.street_type ?? "")}
            onValueChange={(value) => {
              if (value === "Custom") {
                setStreetTypeMode("custom");
                const next = streetTypeCustom.trim().slice(0, 20);
                updateSection("location_context", (prev) => ({
                  ...prev,
                  street_type: next || null
                }));
              } else {
                setStreetTypeMode("preset");
                setStreetTypeCustom(value);
                updateSection("location_context", (prev) => ({
                  ...prev,
                  street_type: value || null
                }));
              }
              triggerAutoSave();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a street type" />
            </SelectTrigger>
            <SelectContent>
              {streetTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {streetTypeMode === "custom" ? (
            <Input
              value={streetTypeCustom}
              onChange={(event) => {
                const next = event.target.value.slice(0, 20);
                setStreetTypeCustom(next);
                updateSection("location_context", (prev) => ({
                  ...prev,
                  street_type: next.trim() || null
                }));
              }}
              onBlur={triggerAutoSave}
              maxLength={20}
              placeholder="Custom (20 char max)"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>County</Label>
          <Input
            value={locationContext.county ?? ""}
            onChange={(event) =>
              updateSection("location_context", (prev) => ({
                ...prev,
                county: toNullableString(event.target.value)
              }))
            }
            onBlur={triggerAutoSave}
          />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Select
            value={locationContext.state ?? ""}
            onValueChange={(value) => {
              updateSection("location_context", (prev) => ({
                ...prev,
                state: value || null
              }));
              triggerAutoSave();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent className="max-h-96">
              {STATE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label} ({option.value})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
