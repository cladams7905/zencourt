import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@web/src/components/ui/card";
import { Input } from "@web/src/components/ui/input";
import { Label } from "@web/src/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@web/src/components/ui/table";
import type {
  ListingPropertyDetails,
  ListingValuationExample
} from "@shared/types/models";
import {
  toNullableNumber,
  toNullableString
} from "@web/src/components/listings/review/shared/formatters";
import type { UpdateReviewSection } from "@web/src/components/listings/review/shared/types";

type ReviewValuationEstimatesCardProps = {
  valuation: NonNullable<ListingPropertyDetails["valuation_estimates"]>;
  valuationExamples: ListingValuationExample[];
  setValuationExamples: (next: ListingValuationExample[]) => void;
  updateSection: UpdateReviewSection;
  triggerAutoSave: () => void;
};

export const ReviewValuationEstimatesCard = ({
  valuation,
  valuationExamples,
  setValuationExamples,
  updateSection,
  triggerAutoSave
}: ReviewValuationEstimatesCardProps) => {
  return (
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
            onClick={() => setValuationExamples([...valuationExamples, {}])}
          >
            Add estimate
          </Button>
        </div>
        {valuationExamples.length === 0 ? (
          <p className="text-xs text-muted-foreground">No valuation examples added.</p>
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
                          provider: toNullableString(event.target.value)
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
                          value_usd: toNullableNumber(event.target.value)
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
                        const next = valuationExamples.filter((_, idx) => idx !== index);
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
  );
};
