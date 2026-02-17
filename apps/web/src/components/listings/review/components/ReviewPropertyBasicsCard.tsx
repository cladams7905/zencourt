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
import type { ListingPropertyDetails } from "@shared/types/models";
import type { SelectMode } from "@web/src/components/listings/review/shared/types";
import {
  formatListingPrice,
  toNullableNumber
} from "@web/src/components/listings/review/shared/formatters";

type ReviewPropertyBasicsCardProps = {
  details: ListingPropertyDetails;
  detailsRef: React.MutableRefObject<ListingPropertyDetails>;
  dirtyRef: React.MutableRefObject<boolean>;
  setDetails: React.Dispatch<React.SetStateAction<ListingPropertyDetails>>;
  priceValue: string;
  setPriceValue: React.Dispatch<React.SetStateAction<string>>;
  propertyTypeMode: SelectMode;
  setPropertyTypeMode: React.Dispatch<React.SetStateAction<SelectMode>>;
  propertyTypeCustom: string;
  setPropertyTypeCustom: React.Dispatch<React.SetStateAction<string>>;
  architectureMode: SelectMode;
  setArchitectureMode: React.Dispatch<React.SetStateAction<SelectMode>>;
  architectureCustom: string;
  setArchitectureCustom: React.Dispatch<React.SetStateAction<string>>;
  propertyTypeOptions: string[];
  architectureOptions: string[];
  updateDetails: (updater: (prev: ListingPropertyDetails) => ListingPropertyDetails) => void;
  triggerAutoSave: () => void;
  normalizeBathrooms: () => void;
  handleSave: (options?: { silent?: boolean }) => Promise<void>;
};

export const ReviewPropertyBasicsCard = ({
  details,
  detailsRef,
  dirtyRef,
  setDetails,
  priceValue,
  setPriceValue,
  propertyTypeMode,
  setPropertyTypeMode,
  propertyTypeCustom,
  setPropertyTypeCustom,
  architectureMode,
  setArchitectureMode,
  architectureCustom,
  setArchitectureCustom,
  propertyTypeOptions,
  architectureOptions,
  updateDetails,
  triggerAutoSave,
  normalizeBathrooms,
  handleSave
}: ReviewPropertyBasicsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Property basics</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={details.address ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label>Listing price</Label>
          <Input
            placeholder="$850,000"
            value={priceValue}
            onChange={(event) => setPriceValue(event.target.value)}
            onBlur={() => {
              const nextPrice = formatListingPrice(priceValue);
              setPriceValue(nextPrice);
              const numericValue = toNullableNumber(nextPrice.replace(/[^\d]/g, ""));
              const nextDetails = {
                ...detailsRef.current,
                listing_price: numericValue
              };
              detailsRef.current = nextDetails;
              setDetails(nextDetails);
              dirtyRef.current = true;
              void handleSave({ silent: true });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Property type</Label>
          <Select
            value={propertyTypeMode === "custom" ? "Custom" : (details.property_type ?? "")}
            onValueChange={(value) => {
              if (value === "Custom") {
                setPropertyTypeMode("custom");
                const next = propertyTypeCustom.trim().slice(0, 20);
                updateDetails((prev) => ({
                  ...prev,
                  property_type: next || null
                }));
              } else {
                setPropertyTypeMode("preset");
                setPropertyTypeCustom(value);
                updateDetails((prev) => ({
                  ...prev,
                  property_type: value || null
                }));
              }
              triggerAutoSave();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a property type" />
            </SelectTrigger>
            <SelectContent>
              {propertyTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {propertyTypeMode === "custom" ? (
            <Input
              value={propertyTypeCustom}
              onChange={(event) => {
                const next = event.target.value.slice(0, 20);
                setPropertyTypeCustom(next);
                updateDetails((prev) => ({
                  ...prev,
                  property_type: next.trim() || null
                }));
              }}
              onBlur={triggerAutoSave}
              maxLength={20}
              placeholder="Custom (20 char max)"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Architecture</Label>
          <Select
            value={architectureMode === "custom" ? "Custom" : (details.architecture ?? "")}
            onValueChange={(value) => {
              if (value === "Custom") {
                setArchitectureMode("custom");
                const next = architectureCustom.trim().slice(0, 20);
                updateDetails((prev) => ({
                  ...prev,
                  architecture: next || null
                }));
              } else {
                setArchitectureMode("preset");
                setArchitectureCustom(value);
                updateDetails((prev) => ({
                  ...prev,
                  architecture: value || null
                }));
              }
              triggerAutoSave();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a style" />
            </SelectTrigger>
            <SelectContent>
              {architectureOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {architectureMode === "custom" ? (
            <Input
              value={architectureCustom}
              onChange={(event) => {
                const next = event.target.value.slice(0, 20);
                setArchitectureCustom(next);
                updateDetails((prev) => ({
                  ...prev,
                  architecture: next.trim() || null
                }));
              }}
              onBlur={triggerAutoSave}
              maxLength={20}
              placeholder="Custom (20 char max)"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Year built</Label>
          <Input
            type="number"
            value={details.year_built ?? ""}
            onChange={(event) =>
              updateDetails((prev) => ({
                ...prev,
                year_built: toNullableNumber(event.target.value)
              }))
            }
            onBlur={triggerAutoSave}
          />
        </div>
        <div className="space-y-2">
          <Label>Living area (sq ft)</Label>
          <Input
            type="number"
            value={details.living_area_sq_ft ?? ""}
            onChange={(event) =>
              updateDetails((prev) => ({
                ...prev,
                living_area_sq_ft: toNullableNumber(event.target.value)
              }))
            }
            onBlur={triggerAutoSave}
          />
        </div>
        <div className="space-y-2">
          <Label>Bedrooms</Label>
          <Input
            type="number"
            value={details.bedrooms ?? ""}
            onChange={(event) =>
              updateDetails((prev) => ({
                ...prev,
                bedrooms: toNullableNumber(event.target.value)
              }))
            }
            onBlur={triggerAutoSave}
          />
        </div>
        <div className="space-y-2">
          <Label>Bathrooms</Label>
          <Input
            type="number"
            value={details.bathrooms ?? ""}
            onChange={(event) =>
              updateDetails((prev) => ({
                ...prev,
                bathrooms: toNullableNumber(event.target.value)
              }))
            }
            onBlur={normalizeBathrooms}
            step="0.5"
          />
        </div>
        <div className="space-y-2">
          <Label>Lot size (acres)</Label>
          <Input
            type="number"
            value={details.lot_size_acres ?? ""}
            onChange={(event) =>
              updateDetails((prev) => ({
                ...prev,
                lot_size_acres: toNullableNumber(event.target.value)
              }))
            }
            onBlur={triggerAutoSave}
          />
        </div>
        <div className="space-y-2">
          <Label>Stories</Label>
          <Input
            type="number"
            value={details.stories ?? ""}
            onChange={(event) =>
              updateDetails((prev) => ({
                ...prev,
                stories: toNullableNumber(event.target.value)
              }))
            }
            onBlur={triggerAutoSave}
          />
        </div>
      </CardContent>
    </Card>
  );
};
