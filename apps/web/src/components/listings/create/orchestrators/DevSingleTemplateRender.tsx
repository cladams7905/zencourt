"use client";

import * as React from "react";
import type { ListingContentSubcategory } from "@shared/types/models";
import { Button } from "@web/src/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@web/src/components/ui/select";
import { Label } from "@web/src/components/ui/label";
import orshotTemplates from "@web/src/lib/domain/media/orshot/templates.json";

const TEMPLATE_IDS = (orshotTemplates as { id: string }[]).map((t) => t.id).sort();

type DevSingleTemplateRenderProps = {
  subcategory: ListingContentSubcategory;
  isGenerating: boolean;
  generateSubcategoryContent: (
    subcategory: ListingContentSubcategory,
    options?: { forceNewBatch?: boolean; generationCount?: number; templateId?: string }
  ) => Promise<void>;
};

/**
 * Development-only control to render a single Orshot template by ID.
 * Renders only when NODE_ENV === "development".
 */
export function DevSingleTemplateRender({
  subcategory,
  isGenerating,
  generateSubcategoryContent
}: DevSingleTemplateRenderProps) {
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>(
    TEMPLATE_IDS[0] ?? ""
  );
  const handleGenerate = React.useCallback(async () => {
    if (!selectedTemplateId.trim()) return;
    await generateSubcategoryContent(subcategory, {
      forceNewBatch: true,
      generationCount: 1,
      templateId: selectedTemplateId.trim()
    });
  }, [
    selectedTemplateId,
    subcategory,
    generateSubcategoryContent
  ]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
        Dev: Single template render
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dev-template-select" className="text-xs">
            Template ID
          </Label>
          <Select
            value={selectedTemplateId}
            onValueChange={(value) => {
              setSelectedTemplateId(value);
            }}
          >
            <SelectTrigger
              id="dev-template-select"
              className="w-[140px]"
              size="sm"
            >
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void handleGenerate()}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate"}
        </Button>
      </div>
    </div>
  );
}
