"use client";

import * as React from "react";
import { toast } from "sonner";
import { ListingViewHeader } from "./ListingViewHeader";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { AlertTriangle, Check, Loader2, SearchCheck, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../ui/dialog";
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
  ListingSaleHistory,
  ListingValuationExample
} from "@shared/types/models";
import { ListingTimeline } from "./ListingTimeline";
import Link from "next/link";

type ListingReviewViewProps = {
  listingId: string;
  userId: string;
  title: string;
  address: string | null;
  propertyDetails: ListingPropertyDetails | null;
  targetAudiences?: string[] | null;
};

const timelineSteps = [
  { label: "Categorize", active: false, completed: true },
  { label: "Review", active: true, completed: false },
  { label: "Create", active: false, completed: false }
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
  "Split-level",
  "Colonial",
  "Craftsman",
  "Traditional",
  "Modern",
  "Contemporary",
  "Farmhouse"
];

const STATE_OPTIONS = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" }
];

type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  onSave?: () => void;
  addLabel?: string;
  singleValue?: boolean;
};

const TagInput = ({
  value,
  onChange,
  placeholder,
  onSave,
  addLabel = "Add feature",
  singleValue = false
}: TagInputProps) => {
  const [inputValue, setInputValue] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);

  const addTag = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const exists = value.some(
        (tag) => tag.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        setInputValue("");
        setIsEditing(false);
        return;
      }
      const next = singleValue ? [trimmed] : [...value, trimmed];
      onChange(next);
      setInputValue("");
      setIsEditing(false);
      onSave?.();
    },
    [onChange, onSave, singleValue, value]
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
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-xs text-foreground"
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
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(inputValue);
              }
              if (event.key === "Escape") {
                setIsEditing(false);
                setInputValue("");
              }
            }}
            onBlur={() => addTag(inputValue)}
            placeholder={placeholder}
            className="h-7 w-40"
            autoFocus
          />
          <Button
            variant="outline"
            onClick={() => addTag(inputValue)}
            className="rounded-full h-7 w-7"
            aria-label="Confirm"
          >
            <Check />
          </Button>
          <Button
            variant="outline"
            className="rounded-full h-7 w-7"
            onClick={() => {
              setIsEditing(false);
              setInputValue("");
            }}
            aria-label="Cancel"
          >
            <X />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-transparent px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsEditing(true)}
        >
          {addLabel}
        </button>
      )}
    </div>
  );
};

export function ListingReviewView({
  listingId,
  userId,
  title,
  address,
  propertyDetails,
  targetAudiences
}: ListingReviewViewProps) {
  const [details, setDetails] = React.useState<ListingPropertyDetails>(() => ({
    ...(propertyDetails ?? {}),
    address: propertyDetails?.address ?? address ?? ""
  }));
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingSave, setPendingSave] = React.useState(false);
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

  const handleSave = React.useCallback(
    async (options?: { silent?: boolean }) => {
      setIsSaving(true);
      try {
        await saveListingPropertyDetails(userId, listingId, detailsRef.current);
        dirtyRef.current = false;
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
    const current = detailsRef.current.bathrooms;
    if (current === null || current === undefined) {
      triggerAutoSave();
      return;
    }
    const rounded = Math.round(current * 2) / 2;
    if (rounded !== current) {
      updateDetails((prev) => ({
        ...prev,
        bathrooms: rounded
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
  const primarySuite = interior.primary_suite ?? {};
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

  const propertyTypeOptions = React.useMemo(
    () => [...PROPERTY_TYPE_OPTIONS, "Custom"],
    []
  );

  const architectureOptions = React.useMemo(
    () => [...ARCHITECTURE_OPTIONS, "Custom"],
    []
  );

  const requiredFixes = React.useMemo(() => {
    const fixes: string[] = [];
    if (!details.address?.trim()) {
      fixes.push("Address is missing.");
    }
    if (!details.property_type?.trim()) {
      fixes.push("Property type is missing.");
    }
    if (!details.architecture?.trim()) {
      fixes.push("Architecture is missing.");
    }
    if (!Number.isFinite(details.year_built ?? NaN)) {
      fixes.push("Year built is missing.");
    }
    if (!Number.isFinite(details.living_area_sq_ft ?? NaN)) {
      fixes.push("Living area is missing.");
    }
    if (!Number.isFinite(details.bedrooms ?? NaN)) {
      fixes.push("Bedrooms count is missing.");
    }
    if (!Number.isFinite(details.bathrooms ?? NaN)) {
      fixes.push("Bathrooms count is missing.");
    }
    if (!Number.isFinite(details.lot_size_acres ?? NaN)) {
      fixes.push("Lot size is missing.");
    }
    if (!Number.isFinite(details.stories ?? NaN)) {
      fixes.push("Stories count is missing.");
    }
    return fixes;
  }, [
    details.address,
    details.architecture,
    details.bathrooms,
    details.bedrooms,
    details.living_area_sq_ft,
    details.lot_size_acres,
    details.property_type,
    details.stories,
    details.year_built
  ]);

  const canContinue = requiredFixes.length === 0;

  return (
    <>
      <ListingViewHeader
        title={title}
        timeline={<ListingTimeline steps={timelineSteps} className="mb-0" />}
        action={
          isSaving ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </div>
          ) : null
        }
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-10">
        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="flex-1 space-y-6">
            <div className="flex w-full items-center gap-3">
              <h2 className="text-xl font-header text-foreground">
                Review Property Details
              </h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    Sources
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[560px]">
                  <DialogHeader>
                    <DialogTitle>Property data sources</DialogTitle>
                    <DialogDescription>
                      Links to the pages used to populate this listing.
                    </DialogDescription>
                  </DialogHeader>
                  {sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No sources captured yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sources.map((entry, index) => (
                        <div
                          key={`source-link-${index}`}
                          className="rounded-md border border-border bg-secondary/40 px-3 py-2"
                        >
                          <div className="text-sm font-medium text-foreground">
                            {entry.citation ? (
                              <a
                                href={entry.citation}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-foreground underline decoration-border/70 underline-offset-4 hover:text-muted-foreground"
                              >
                                {entry.site ?? `Source ${index + 1}`}
                              </a>
                            ) : (
                              <span>{entry.site ?? `Source ${index + 1}`}</span>
                            )}
                          </div>
                          {entry.notes ? (
                            <p className="text-xs text-muted-foreground">
                              {entry.notes}
                            </p>
                          ) : null}
                          {!entry.citation ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              No URL provided.
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Property basics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address</Label>
                  <Input value={details.address ?? ""} disabled />
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
                    placeholder="e.g., Brick"
                    addLabel="Add material"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exterior highlights</Label>
                  <TagInput
                    value={exterior.highlights ?? []}
                    onChange={(next) =>
                      updateSection("exterior_features", (prev) => ({
                        ...prev,
                        highlights: next.length > 0 ? next : null
                      }))
                    }
                    onSave={triggerAutoSave}
                    placeholder="e.g., Covered patio"
                    addLabel="Add highlight"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interior features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Living Spaces
                  </p>
                  <TagInput
                    value={details.living_spaces ?? []}
                    onChange={(next) =>
                      updateDetails((prev) => ({
                        ...prev,
                        living_spaces: next.length > 0 ? next : null
                      }))
                    }
                    onSave={triggerAutoSave}
                    placeholder="e.g., Formal dining"
                    addLabel="Add living space"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Kitchen
                  </p>
                  <TagInput
                    value={kitchen.features ?? []}
                    onChange={(next) =>
                      updateSection("interior_features", (prev) => ({
                        ...prev,
                        kitchen: {
                          ...(prev.kitchen ?? {}),
                          features: next.length > 0 ? next : null
                        }
                      }))
                    }
                    onSave={triggerAutoSave}
                    placeholder="e.g., Granite countertops"
                    addLabel="Add kitchen feature"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Additional Spaces
                  </p>
                  <TagInput
                    value={details.additional_spaces ?? []}
                    onChange={(next) =>
                      updateDetails((prev) => ({
                        ...prev,
                        additional_spaces: next.length > 0 ? next : null
                      }))
                    }
                    onSave={triggerAutoSave}
                    placeholder="e.g., Office/flex"
                    addLabel="Add space"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Primary Suite
                  </p>
                  <TagInput
                    value={primarySuite.features ?? []}
                    onChange={(next) =>
                      updateSection("interior_features", (prev) => ({
                        ...prev,
                        primary_suite: {
                          ...(prev.primary_suite ?? {}),
                          features: next.length > 0 ? next : null
                        }
                      }))
                    }
                    onSave={triggerAutoSave}
                    placeholder="e.g., Walk-in closet"
                    addLabel="Add feature"
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
          </section>

          <aside className="w-full lg:w-72 mt-14">
            <div className="sticky top-[124px] space-y-4">
              <div className="rounded-lg border border-border bg-secondary px-4 py-4 space-y-3">
                <div className="flex gap-3 items-center rounded-lg p-2">
                  <SearchCheck className="h-8 w-8 text-foreground" />
                  <p className="text-xs text-foreground">
                    Please review all property details for accuracy before
                    continuing.
                  </p>
                </div>
                {requiredFixes.length > 0 ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                    <p className="text-[11px] font-semibold uppercase tracking-wide">
                      Required fixes
                    </p>
                    <ul className="mt-2 space-y-2 text-destructive">
                      {requiredFixes.map((fix) => (
                        <li key={fix} className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <Button
                  className="w-full"
                  onClick={() => handleSave()}
                  disabled={!canContinue || isSaving}
                >
                  Continue
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full hover:bg-foreground/5"
                >
                  <Link href={`/listings/${listingId}`}>Go back</Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
