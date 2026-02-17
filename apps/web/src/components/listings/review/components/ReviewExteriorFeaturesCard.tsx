import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@web/src/components/ui/card";
import { Label } from "@web/src/components/ui/label";
import { TagInput } from "@web/src/components/listings/review/components/TagInput";
import type { ListingPropertyDetails } from "@shared/types/models";
import type { UpdateReviewSection } from "@web/src/components/listings/review/shared/types";

type ReviewExteriorFeaturesCardProps = {
  exterior: NonNullable<ListingPropertyDetails["exterior_features"]>;
  updateSection: UpdateReviewSection;
  triggerAutoSave: () => void;
};

export const ReviewExteriorFeaturesCard = ({
  exterior,
  updateSection,
  triggerAutoSave
}: ReviewExteriorFeaturesCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exterior features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
  );
};
