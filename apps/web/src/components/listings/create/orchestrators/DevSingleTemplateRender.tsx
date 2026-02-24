"use client";

import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";
import { buildTemplateRenderCaptionItems } from "@web/src/components/listings/create/domain/listingCreateUtils";
import { streamTemplateRenderEvents } from "@web/src/components/listings/create/domain/templateRender/streamEvents";
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
  listingId: string;
  subcategory: ListingContentSubcategory;
  captionItems: ContentItem[];
};

/**
 * Development-only control to render a single Orshot template by ID.
 * Renders only when NODE_ENV === "development".
 */
export function DevSingleTemplateRender({
  listingId,
  subcategory,
  captionItems
}: DevSingleTemplateRenderProps) {
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>(
    TEMPLATE_IDS[0] ?? ""
  );
  const [isRendering, setIsRendering] = React.useState(false);
  const [lastImageUrl, setLastImageUrl] = React.useState<string | null>(null);
  const [lastError, setLastError] = React.useState<string | null>(null);

  const handleGenerate = React.useCallback(async () => {
    if (!selectedTemplateId.trim()) return;
    const templateCaptionItems = buildTemplateRenderCaptionItems(captionItems);
    const firstCaption = templateCaptionItems[0];
    if (!firstCaption) {
      setLastError("No caption content available. Generate content first.");
      setLastImageUrl(null);
      return;
    }

    setIsRendering(true);
    setLastError(null);
    setLastImageUrl(null);

    try {
      const response = await fetch(
        `/api/v1/listings/${listingId}/templates/render/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subcategory,
            captionItems: [firstCaption],
            templateCount: 1,
            templateId: selectedTemplateId.trim()
          }),
          cache: "no-store"
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          (payload as { message?: string }).message ?? "Render request failed"
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Streaming response not available");
      }

      let gotItem = false;
      for await (const event of streamTemplateRenderEvents(reader)) {
        if (event.type === "item") {
          setLastImageUrl(event.item.imageUrl);
          setLastError(null);
          gotItem = true;
        }
        if (event.type === "error") {
          setLastError(event.message);
          setLastImageUrl(null);
        }
        if (
          event.type === "done" &&
          event.failedTemplateIds?.length &&
          !gotItem
        ) {
          setLastError(
            `Template(s) failed: ${event.failedTemplateIds.join(", ")}`
          );
        }
      }
    } catch (err) {
      setLastError(
        err instanceof Error ? err.message : "Failed to render template"
      );
      setLastImageUrl(null);
    } finally {
      setIsRendering(false);
    }
  }, [
    selectedTemplateId,
    listingId,
    subcategory,
    captionItems
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
              setLastError(null);
              setLastImageUrl(null);
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
          disabled={isRendering || captionItems.length === 0}
        >
          {isRendering ? "Rendering…" : "Generate"}
        </Button>
      </div>
      {captionItems.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Generate content for this subcategory first.
        </p>
      )}
      {lastError && (
        <p className="mt-2 text-xs text-destructive">{lastError}</p>
      )}
      {lastImageUrl && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- dev preview; URL may be data or external */}
          <img
            src={lastImageUrl}
            alt="Rendered template"
            className="max-h-48 rounded border border-border object-contain"
          />
        </div>
      )}
    </div>
  );
}
