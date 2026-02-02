"use client";

import * as React from "react";
import { toast } from "sonner";
import { ListingViewHeader } from "./ListingViewHeader";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table";
import { saveListingPropertyDetails } from "@web/src/server/actions/api/listingProperty";
import type {
  ListingPropertyDetails,
  ListingPropertySource,
  ListingSaleHistory,
  ListingValuationExample
} from "@shared/types/models";

type ListingReviewViewProps = {
  listingId: string;
  userId: string;
  title: string;
  address: string | null;
  propertyDetails: ListingPropertyDetails | null;
  fetchedAt?: Date | null;
  source?: string | null;
  targetAudiences?: string[] | null;
};

const timelineSteps = [
  { label: "Upload", active: false },
  { label: "Review", active: true },
  { label: "Create", active: false }
];

const toNullableString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNullableNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDateTime = (value?: Date | null) =>
  value ? new Date(value).toLocaleString() : "Not available";

const PROPERTY_TYPE_OPTIONS = [
  "Single Family Residence",
  "Condo",
  "Townhouse",
  "Multi-Family",
  "Manufactured",
  "Land",
  "Other"
];

const ARCHITECTURE_OPTIONS = [
  "Ranch",
  "2-story",
  "3-story",
  "Split-level",
  "Colonial",
  "Craftsman",
  "Traditional",
  "Modern",
  "Contemporary",
  "Farmhouse",
  "Other"
];

type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  onSave?: () => void;
};

const TagInput = ({ value, onChange, placeholder, onSave }: TagInputProps) => {
  const [inputValue, setInputValue] = React.useState("");

  const addTag = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const exists = value.some(
        (tag) => tag.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        setInputValue("");
        return;
      }
      onChange([...value, trimmed]);
      setInputValue("");
      onSave?.();
    },
    [onChange, onSave, value]
  );

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
    onSave?.();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary px-2 py-1 text-xs text-foreground"
        >
          {tag}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTag(inputValue);
          }
        }}
        onBlur={() => addTag(inputValue)}
        placeholder={placeholder}
        className="h-9 w-48"
      />
    </div>
  );
};

type TagToggleOption = {
  label: string;
  value: string;
};

type TagToggleGroupProps = {
  selected: string[];
  options: TagToggleOption[];
  onChange: (next: string[]) => void;
  onSave?: () => void;
};

const TagToggleGroup = ({
  selected,
  options,
  onChange,
  onSave
}: TagToggleGroupProps) => {
  const toggle = (value: string) => {
    const exists = selected.includes(value);
    const next = exists
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(next);
    onSave?.();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border/60 bg-secondary text-foreground hover:border-foreground/60"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export function ListingReviewView({
  listingId,
  userId,
  title,
  address,
  propertyDetails,
  fetchedAt,
  source,
  targetAudiences
}: ListingReviewViewProps) {
  const [details, setDetails] = React.useState<ListingPropertyDetails>(() => ({
    ...(propertyDetails ?? {}),
    address: propertyDetails?.address ?? address ?? ""
  }));
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingSave, setPendingSave] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const detailsRef = React.useRef(details);
  const dirtyRef = React.useRef(false);
  const [propertyTypeMode, setPropertyTypeMode] = React.useState<
    "preset" | "custom"
  >(() => {
    const current = (propertyDetails?.property_type ?? "").trim();
    if (current && !PROPERTY_TYPE_OPTIONS.includes(current)) {
      return "custom";
    }
    return "preset";
  });
  const [architectureMode, setArchitectureMode] = React.useState<
    "preset" | "custom"
  >(() => {
    const current = (propertyDetails?.architecture ?? "").trim();
    if (current && !ARCHITECTURE_OPTIONS.includes(current)) {
      return "custom";
    }
    return "preset";
  });
  const [propertyTypeCustom, setPropertyTypeCustom] = React.useState(
    () => details.property_type ?? ""
  );
  const [architectureCustom, setArchitectureCustom] = React.useState(
    () => details.architecture ?? ""
  );

  const updateDetails = React.useCallback(
    (updater: (prev: ListingPropertyDetails) => ListingPropertyDetails) => {
      setDetails((prev) => {
        const next = updater(prev ?? {});
        detailsRef.current = next;
        return next;
      });
      dirtyRef.current = true;
      setIsDirty(true);
    },
    []
  );

  const updateSection = React.useCallback(
    <T extends keyof ListingPropertyDetails>(
      key: T,
      updater: (
        prev: NonNullable<ListingPropertyDetails[T]>
      ) => NonNullable<ListingPropertyDetails[T]>
    ) => {
      updateDetails((prev) => {
        const current = (prev[key] ?? {}) as NonNullable<
          ListingPropertyDetails[T]
        >;
        return {
          ...prev,
          [key]: updater(current)
        };
      });
    },
    [updateDetails]
  );

  const setSaleHistory = React.useCallback(
    (next: ListingSaleHistory[]) => {
      updateDetails((prev) => ({
        ...prev,
        sale_history: next.length > 0 ? next : null
      }));
    },
    [updateDetails]
  );

  const setValuationExamples = React.useCallback(
    (next: ListingValuationExample[]) => {
      updateSection("valuation_estimates", (prev) => ({
        ...prev,
        third_party_examples: next.length > 0 ? next : null
      }));
    },
    [updateSection]
  );

  const setSources = React.useCallback(
    (next: ListingPropertySource[]) => {
      updateDetails((prev) => ({
        ...prev,
        sources: next.length > 0 ? next : null
      }));
    },
    [updateDetails]
  );

  const handleSave = React.useCallback(
    async (options?: { silent?: boolean }) => {
      setIsSaving(true);
      try {
        await saveListingPropertyDetails(userId, listingId, detailsRef.current);
        setLastSavedAt(new Date());
        dirtyRef.current = false;
        setIsDirty(false);
        if (!options?.silent) {
          toast.success("Property details saved.");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save details."
        );
      } finally {
        setIsSaving(false);
        setPendingSave(false);
      }
    },
    [listingId, userId]
  );

  const triggerAutoSave = React.useCallback(() => {
    if (!dirtyRef.current) {
      return;
    }
    if (isSaving) {
      setPendingSave(true);
      return;
    }
    void handleSave({ silent: true });
  }, [handleSave, isSaving]);

  React.useEffect(() => {
    if (!isSaving && pendingSave && dirtyRef.current) {
      void handleSave({ silent: true });
    }
  }, [handleSave, isSaving, pendingSave]);

  const normalizeBathrooms = React.useCallback(() => {
    const current = detailsRef.current.bathrooms_full;
    if (current === null || current === undefined) {
      triggerAutoSave();
      return;
    }
    const rounded = Math.round(current * 2) / 2;
    if (rounded !== current) {
      updateDetails((prev) => ({
        ...prev,
        bathrooms_full: rounded
      }));
      toast.message("Bathrooms rounded to the nearest 0.5.");
      triggerAutoSave();
    } else {
      triggerAutoSave();
    }
  }, [triggerAutoSave, updateDetails]);

  const exterior = details.exterior_features ?? {};
  const interior = details.interior_features ?? {};
  const kitchen = interior.kitchen ?? {};
  const bedroomLayout = interior.bedroom_layout ?? {};
  const primaryBedroom = interior.primary_bedroom ?? {};
  const basement = details.basement ?? {};
  const garage = details.garage ?? {};
  const hoa = details.hoa ?? {};
  const valuation = details.valuation_estimates ?? {};
  const locationContext = details.location_context ?? {};

  const saleHistory = details.sale_history ?? [];
  const valuationExamples = valuation.third_party_examples ?? [];
  const sources = details.sources ?? [];

  const audienceSet = React.useMemo(
    () => new Set((targetAudiences ?? []).map((entry) => entry.toLowerCase())),
    [targetAudiences]
  );
  const showInvestorFields =
    audienceSet.has("real_estate_investors") ||
    audienceSet.has("luxury_homebuyers") ||
    audienceSet.has("downsizers_retirees");
  const showFamilyFields =
    audienceSet.has("growing_families") ||
    audienceSet.has("first_time_homebuyers");
  const showLuxuryFields =
    audienceSet.has("luxury_homebuyers") ||
    audienceSet.has("downsizers_retirees");
  const showBasementFields = showFamilyFields || showInvestorFields;

  const propertyTypeOptions = React.useMemo(
    () => [...PROPERTY_TYPE_OPTIONS, "Custom"],
    []
  );

  const architectureOptions = React.useMemo(
    () => [...ARCHITECTURE_OPTIONS, "Custom"],
    []
  );

  return (
    <>
      <ListingViewHeader
        title={title}
        action={
          isSaving ? (
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving draft
            </div>
          ) : null
        }
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-8 py-10">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="relative flex items-center justify-between mb-6">
            <div className="absolute left-0 top-[5px] h-px w-full bg-border -z-10" />
            {timelineSteps.map((step) => (
              <div
                key={step.label}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`h-2.5 w-2.5 rotate-45 ring-4 ring-background shadow-sm ${
                    step.active
                      ? "bg-foreground"
                      : "bg-background border border-border"
                  }`}
                />
                <span
                  className={`mt-1.5 text-[11px] uppercase tracking-widest ${
                    step.active
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="flex-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Property basics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={details.address ?? ""}
                    onChange={(event) =>
                      updateDetails((prev) => ({
                        ...prev,
                        address: toNullableString(event.target.value)
                      }))
                    }
                    onBlur={triggerAutoSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Property type</Label>
                  <Select
                    value={
                      propertyTypeMode === "custom"
                        ? "Custom"
                        : (details.property_type ?? "")
                    }
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
                    value={
                      architectureMode === "custom"
                        ? "Custom"
                        : (details.architecture ?? "")
                    }
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
                    value={details.bathrooms_full ?? ""}
                    onChange={(event) =>
                      updateDetails((prev) => ({
                        ...prev,
                        bathrooms_full: toNullableNumber(event.target.value)
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exterior features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Materials</Label>
                  <TagInput
                    value={exterior.materials ?? []}
                    onChange={(next) =>
                      updateSection("exterior_features", (prev) => ({
                        ...prev,
                        materials: next.length > 0 ? next : null
                      }))
                    }
                    onSave={triggerAutoSave}
                    placeholder="Add a material"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exterior highlights</Label>
                  <TagToggleGroup
                    selected={
                      [
                        exterior.front_porch ? "front_porch" : null,
                        exterior.rear_deck ? "rear_deck" : null
                      ].filter(Boolean) as string[]
                    }
                    options={[
                      { label: "Front porch", value: "front_porch" },
                      { label: "Rear deck", value: "rear_deck" }
                    ]}
                    onChange={(selected) =>
                      updateSection("exterior_features", (prev) => ({
                        ...prev,
                        front_porch: selected.includes("front_porch"),
                        rear_deck: selected.includes("rear_deck")
                      }))
                    }
                    onSave={triggerAutoSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other exterior notes</Label>
                  <TagInput
                    value={exterior.other_features ?? []}
                    onChange={(next) =>
                      updateSection("exterior_features", (prev) => ({
                        ...prev,
                        other_features: next.length > 0 ? next : null
                      }))
                    }
                    onSave={triggerAutoSave}
                    placeholder="Add a feature"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interior features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Main level flooring</Label>
                    <Input
                      value={interior.flooring_main_level ?? ""}
                      onChange={(event) =>
                        updateSection("interior_features", (prev) => ({
                          ...prev,
                          flooring_main_level: toNullableString(
                            event.target.value
                          )
                        }))
                      }
                      onBlur={triggerAutoSave}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Interior highlights</Label>
                    <TagToggleGroup
                      selected={interior.fireplace ? ["fireplace"] : []}
                      options={[{ label: "Fireplace", value: "fireplace" }]}
                      onChange={(selected) =>
                        updateSection("interior_features", (prev) => ({
                          ...prev,
                          fireplace: selected.includes("fireplace")
                        }))
                      }
                      onSave={triggerAutoSave}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Kitchen countertops</Label>
                    <Input
                      value={kitchen.countertops ?? ""}
                      onChange={(event) =>
                        updateSection("interior_features", (prev) => ({
                          ...prev,
                          kitchen: {
                            ...(prev.kitchen ?? {}),
                            countertops: toNullableString(event.target.value)
                          }
                        }))
                      }
                      onBlur={triggerAutoSave}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Kitchen features</Label>
                    <TagToggleGroup
                      selected={
                        [
                          kitchen.pantry ? "pantry" : null,
                          kitchen.open_to_family_room
                            ? "open_to_family_room"
                            : null,
                          kitchen.breakfast_area ? "breakfast_area" : null
                        ].filter(Boolean) as string[]
                      }
                      options={[
                        { label: "Pantry", value: "pantry" },
                        {
                          label: "Open to family room",
                          value: "open_to_family_room"
                        },
                        { label: "Breakfast area", value: "breakfast_area" }
                      ]}
                      onChange={(selected) =>
                        updateSection("interior_features", (prev) => ({
                          ...prev,
                          kitchen: {
                            ...(prev.kitchen ?? {}),
                            pantry: selected.includes("pantry"),
                            open_to_family_room: selected.includes(
                              "open_to_family_room"
                            ),
                            breakfast_area: selected.includes("breakfast_area")
                          }
                        }))
                      }
                      onSave={triggerAutoSave}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rooms on main level</Label>
                  <TagInput
                    value={interior.rooms_main_level ?? []}
                    onChange={(next) =>
                      updateSection("interior_features", (prev) => ({
                        ...prev,
                        rooms_main_level: next.length > 0 ? next : null
                      }))
                    }
                    onSave={triggerAutoSave}
                    placeholder="Add a room"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Laundry room</Label>
                  <Input
                    value={interior.laundry_room ?? ""}
                    onChange={(event) =>
                      updateSection("interior_features", (prev) => ({
                        ...prev,
                        laundry_room: toNullableString(event.target.value)
                      }))
                    }
                    onBlur={triggerAutoSave}
                  />
                </div>
                {showFamilyFields ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Upper level bedrooms</Label>
                      <Input
                        type="number"
                        value={bedroomLayout.upper_level_bedrooms ?? ""}
                        onChange={(event) =>
                          updateSection("interior_features", (prev) => ({
                            ...prev,
                            bedroom_layout: {
                              ...(prev.bedroom_layout ?? {}),
                              upper_level_bedrooms: toNullableNumber(
                                event.target.value
                              )
                            }
                          }))
                        }
                        onBlur={triggerAutoSave}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bedroom layout features</Label>
                      <TagToggleGroup
                        selected={
                          bedroomLayout.fourth_bedroom_or_bonus
                            ? ["fourth_bedroom_or_bonus"]
                            : []
                        }
                        options={[
                          {
                            label: "Fourth bedroom/bonus",
                            value: "fourth_bedroom_or_bonus"
                          }
                        ]}
                        onChange={(selected) =>
                          updateSection("interior_features", (prev) => ({
                            ...prev,
                            bedroom_layout: {
                              ...(prev.bedroom_layout ?? {}),
                              fourth_bedroom_or_bonus: selected.includes(
                                "fourth_bedroom_or_bonus"
                              )
                            }
                          }))
                        }
                        onSave={triggerAutoSave}
                      />
                    </div>
                  </div>
                ) : null}
                {showFamilyFields || showLuxuryFields ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Primary bedroom level</Label>
                        <Input
                          value={primaryBedroom.level ?? ""}
                          onChange={(event) =>
                            updateSection("interior_features", (prev) => ({
                              ...prev,
                              primary_bedroom: {
                                ...(prev.primary_bedroom ?? {}),
                                level: toNullableString(event.target.value)
                              }
                            }))
                          }
                          onBlur={triggerAutoSave}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Primary bedroom size</Label>
                        <Input
                          value={primaryBedroom.approx_size ?? ""}
                          onChange={(event) =>
                            updateSection("interior_features", (prev) => ({
                              ...prev,
                              primary_bedroom: {
                                ...(prev.primary_bedroom ?? {}),
                                approx_size: toNullableString(
                                  event.target.value
                                )
                              }
                            }))
                          }
                          onBlur={triggerAutoSave}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Primary bedroom features</Label>
                      <TagInput
                        value={primaryBedroom.features ?? []}
                        onChange={(next) =>
                          updateSection("interior_features", (prev) => ({
                            ...prev,
                            primary_bedroom: {
                              ...(prev.primary_bedroom ?? {}),
                              features: next.length > 0 ? next : null
                            }
                          }))
                        }
                        onSave={triggerAutoSave}
                        placeholder="Add a feature"
                      />
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Basement, garage, HOA</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {showBasementFields ? (
                  <>
                    <div className="space-y-2">
                      <Label>Basement type</Label>
                      <Input
                        value={basement.type ?? ""}
                        onChange={(event) =>
                          updateSection("basement", (prev) => ({
                            ...prev,
                            type: toNullableString(event.target.value)
                          }))
                        }
                        onBlur={triggerAutoSave}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Basement features</Label>
                      <TagToggleGroup
                        selected={basement.finished ? ["finished"] : []}
                        options={[
                          { label: "Finished basement", value: "finished" }
                        ]}
                        onChange={(selected) =>
                          updateSection("basement", (prev) => ({
                            ...prev,
                            finished: selected.includes("finished")
                          }))
                        }
                        onSave={triggerAutoSave}
                      />
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <Label>Garage capacity</Label>
                  <Input
                    type="number"
                    value={garage.car_capacity ?? ""}
                    onChange={(event) =>
                      updateSection("garage", (prev) => ({
                        ...prev,
                        car_capacity: toNullableNumber(event.target.value)
                      }))
                    }
                    onBlur={triggerAutoSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Garage location</Label>
                  <Input
                    value={garage.location ?? ""}
                    onChange={(event) =>
                      updateSection("garage", (prev) => ({
                        ...prev,
                        location: toNullableString(event.target.value)
                      }))
                    }
                    onBlur={triggerAutoSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HOA</Label>
                  <TagToggleGroup
                    selected={hoa.has_hoa ? ["has_hoa"] : []}
                    options={[{ label: "Has HOA", value: "has_hoa" }]}
                    onChange={(selected) =>
                      updateSection("hoa", (prev) => ({
                        ...prev,
                        has_hoa: selected.includes("has_hoa")
                      }))
                    }
                    onSave={triggerAutoSave}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HOA monthly fee (USD)</Label>
                  <Input
                    type="number"
                    value={hoa.monthly_fee_usd ?? ""}
                    onChange={(event) =>
                      updateSection("hoa", (prev) => ({
                        ...prev,
                        monthly_fee_usd: toNullableNumber(event.target.value)
                      }))
                    }
                    onBlur={triggerAutoSave}
                  />
                </div>
              </CardContent>
            </Card>

            {showInvestorFields ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sale history</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Sales</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSaleHistory([...saleHistory, {}])}
                    >
                      Add sale
                    </Button>
                  </div>
                  {saleHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No sale history added.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Close date</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>$/sq ft</TableHead>
                          <TableHead>List price</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleHistory.map((entry, index) => (
                          <TableRow key={`sale-${index}`}>
                            <TableCell>
                              <Input
                                value={entry.event ?? ""}
                                onChange={(event) => {
                                  const next = [...saleHistory];
                                  next[index] = {
                                    ...next[index],
                                    event: toNullableString(event.target.value)
                                  };
                                  setSaleHistory(next);
                                }}
                                onBlur={triggerAutoSave}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={entry.close_date ?? ""}
                                onChange={(event) => {
                                  const next = [...saleHistory];
                                  next[index] = {
                                    ...next[index],
                                    close_date: toNullableString(
                                      event.target.value
                                    )
                                  };
                                  setSaleHistory(next);
                                }}
                                onBlur={triggerAutoSave}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={entry.sale_price_usd ?? ""}
                                onChange={(event) => {
                                  const next = [...saleHistory];
                                  next[index] = {
                                    ...next[index],
                                    sale_price_usd: toNullableNumber(
                                      event.target.value
                                    )
                                  };
                                  setSaleHistory(next);
                                }}
                                onBlur={triggerAutoSave}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={entry.price_per_sq_ft_usd ?? ""}
                                onChange={(event) => {
                                  const next = [...saleHistory];
                                  next[index] = {
                                    ...next[index],
                                    price_per_sq_ft_usd: toNullableNumber(
                                      event.target.value
                                    )
                                  };
                                  setSaleHistory(next);
                                }}
                                onBlur={triggerAutoSave}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={entry.list_price_usd ?? ""}
                                onChange={(event) => {
                                  const next = [...saleHistory];
                                  next[index] = {
                                    ...next[index],
                                    list_price_usd: toNullableNumber(
                                      event.target.value
                                    )
                                  };
                                  setSaleHistory(next);
                                }}
                                onBlur={triggerAutoSave}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const next = saleHistory.filter(
                                    (_, idx) => idx !== index
                                  );
                                  setSaleHistory(next);
                                }}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {showInvestorFields ? (
              <Card>
                <CardHeader>
                  <CardTitle>Valuation estimates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Range low (USD)</Label>
                      <Input
                        type="number"
                        value={valuation.range_low_usd ?? ""}
                        onChange={(event) =>
                          updateSection("valuation_estimates", (prev) => ({
                            ...prev,
                            range_low_usd: toNullableNumber(event.target.value)
                          }))
                        }
                        onBlur={triggerAutoSave}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Range high (USD)</Label>
                      <Input
                        type="number"
                        value={valuation.range_high_usd ?? ""}
                        onChange={(event) =>
                          updateSection("valuation_estimates", (prev) => ({
                            ...prev,
                            range_high_usd: toNullableNumber(event.target.value)
                          }))
                        }
                        onBlur={triggerAutoSave}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Third-party estimates</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setValuationExamples([...valuationExamples, {}])
                      }
                    >
                      Add estimate
                    </Button>
                  </div>
                  {valuationExamples.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No valuation examples added.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Provider</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {valuationExamples.map((entry, index) => (
                          <TableRow key={`valuation-${index}`}>
                            <TableCell>
                              <Input
                                value={entry.provider ?? ""}
                                onChange={(event) => {
                                  const next = [...valuationExamples];
                                  next[index] = {
                                    ...next[index],
                                    provider: toNullableString(
                                      event.target.value
                                    )
                                  };
                                  setValuationExamples(next);
                                }}
                                onBlur={triggerAutoSave}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={entry.value_usd ?? ""}
                                onChange={(event) => {
                                  const next = [...valuationExamples];
                                  next[index] = {
                                    ...next[index],
                                    value_usd: toNullableNumber(
                                      event.target.value
                                    )
                                  };
                                  setValuationExamples(next);
                                }}
                                onBlur={triggerAutoSave}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const next = valuationExamples.filter(
                                    (_, idx) => idx !== index
                                  );
                                  setValuationExamples(next);
                                }}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ) : null}

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
                  <Label>Street type</Label>
                  <Input
                    value={locationContext.street_type ?? ""}
                    onChange={(event) =>
                      updateSection("location_context", (prev) => ({
                        ...prev,
                        street_type: toNullableString(event.target.value)
                      }))
                    }
                    onBlur={triggerAutoSave}
                  />
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
                  <Input
                    value={locationContext.state ?? ""}
                    onChange={(event) =>
                      updateSection("location_context", (prev) => ({
                        ...prev,
                        state: toNullableString(event.target.value)
                      }))
                    }
                    onBlur={triggerAutoSave}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Source notes</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSources([...sources, {}])}
                  >
                    Add source
                  </Button>
                </div>
                {sources.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No sources captured yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Citation</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sources.map((entry, index) => (
                        <TableRow key={`source-${index}`}>
                          <TableCell>
                            <Input
                              value={entry.site ?? ""}
                              onChange={(event) => {
                                const next = [...sources];
                                next[index] = {
                                  ...next[index],
                                  site: toNullableString(event.target.value)
                                };
                                setSources(next);
                              }}
                              onBlur={triggerAutoSave}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={entry.notes ?? ""}
                              onChange={(event) => {
                                const next = [...sources];
                                next[index] = {
                                  ...next[index],
                                  notes: toNullableString(event.target.value)
                                };
                                setSources(next);
                              }}
                              onBlur={triggerAutoSave}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={entry.citation ?? ""}
                              onChange={(event) => {
                                const next = [...sources];
                                next[index] = {
                                  ...next[index],
                                  citation: toNullableString(event.target.value)
                                };
                                setSources(next);
                              }}
                              onBlur={triggerAutoSave}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const next = sources.filter(
                                  (_, idx) => idx !== index
                                );
                                setSources(next);
                              }}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="w-full lg:w-72 mt-2">
            <div className="sticky top-[124px] space-y-4">
              <div className="rounded-xl border border-border/60 bg-secondary px-4 py-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Data source
                  </p>
                  <p className="text-sm text-foreground">
                    {source ?? "Manual"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Last fetched
                  </p>
                  <p className="text-sm text-foreground">
                    {formatDateTime(fetchedAt ?? null)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Last saved
                  </p>
                  <p className="text-sm text-foreground">
                    {formatDateTime(lastSavedAt)}
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleSave()}
                  disabled={!isDirty || isSaving}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
