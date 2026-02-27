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

type OrshotTemplateOption = {
  id: string;
  thumbnailUrl?: string;
};

const TEMPLATE_OPTIONS = (orshotTemplates as OrshotTemplateOption[])
  .map((t) => ({
    id: String(t.id),
    thumbnailUrl: typeof t.thumbnailUrl === "string" ? t.thumbnailUrl : ""
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

type DevSingleTemplateRenderProps = {
  subcategory: ListingContentSubcategory;
  isGenerating: boolean;
  generateSubcategoryContent: (
    subcategory: ListingContentSubcategory,
    options?: {
      forceNewBatch?: boolean;
      generationCount?: number;
      templateId?: string;
    }
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
    TEMPLATE_OPTIONS[0]?.id ?? ""
  );
  const selectedTemplate =
    TEMPLATE_OPTIONS.find((option) => option.id === selectedTemplateId) ?? null;

  const handleGenerate = React.useCallback(async () => {
    if (!selectedTemplateId.trim()) return;
    await generateSubcategoryContent(subcategory, {
      forceNewBatch: true,
      generationCount: 1,
      templateId: selectedTemplateId.trim()
    });
  }, [selectedTemplateId, subcategory, generateSubcategoryContent]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
        Dev: Single template render
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {selectedTemplate?.thumbnailUrl ? (
          <div className="mb-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- dev-only template thumbnails */}
            <img
              src={selectedTemplate.thumbnailUrl}
              alt=""
              className="h-16 w-16 rounded object-cover"
            />
          </div>
        ) : null}
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
              className="w-[260px]"
              size="sm"
            >
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  textValue={option.id}
                  itemText={option.id}
                  itemContentOrder="childrenFirst"
                >
                  {option.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- dev-only template thumbnails
                    <img
                      src={option.thumbnailUrl}
                      alt=""
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : null}
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
