import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@web/src/components/ui/card";
import { Label } from "@web/src/components/ui/label";
import { TagInput } from "@web/src/components/listings/review/components/TagInput";
import type { ListingPropertyDetails } from "@shared/types/models";
import type { UpdateReviewSection } from "@web/src/components/listings/review/shared/types";

type ReviewInteriorFeaturesCardProps = {
  details: ListingPropertyDetails;
  kitchen: NonNullable<
    NonNullable<ListingPropertyDetails["interior_features"]>["kitchen"]
  >;
  primarySuite: NonNullable<
    NonNullable<ListingPropertyDetails["interior_features"]>["primary_suite"]
  >;
  updateDetails: (updater: (prev: ListingPropertyDetails) => ListingPropertyDetails) => void;
  updateSection: UpdateReviewSection;
  triggerAutoSave: () => void;
};

export const ReviewInteriorFeaturesCard = ({
  details,
  kitchen,
  primarySuite,
  updateDetails,
  updateSection,
  triggerAutoSave
}: ReviewInteriorFeaturesCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interior features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Living Spaces</Label>
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

        <div className="space-y-2">
          <Label>Kitchen</Label>
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

        <div className="space-y-2">
          <Label>Additional Spaces</Label>
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

        <div className="space-y-2">
          <Label>Primary Suite</Label>
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
  );
};
