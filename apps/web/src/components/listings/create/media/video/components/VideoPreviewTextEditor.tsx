import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import { Input } from "@web/src/components/ui/input";
import { Label } from "@web/src/components/ui/label";
import { Textarea } from "@web/src/components/ui/textarea";

type VideoPreviewTextEditorProps = {
  captionSubcategoryLabel: string;
  variationNumber: number;
  hookValue: string;
  captionValue: string;
  slideNotes: Array<{ key: string; header: string; content: string }>;
  isDirty: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  onHookChange: (value: string) => void;
  onCaptionChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function VideoPreviewTextEditor({
  captionSubcategoryLabel,
  variationNumber,
  hookValue,
  captionValue,
  slideNotes,
  isDirty,
  isSaving,
  errorMessage,
  onHookChange,
  onCaptionChange,
  onCancel,
  onSave
}: VideoPreviewTextEditorProps) {
  return (
    <div className="min-h-0 rounded-lg bg-card xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {captionSubcategoryLabel} Caption · Variation {variationNumber}
          </p>

          <div className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="video-preview-header">Header</Label>
              <Input
                id="video-preview-header"
                value={hookValue}
                disabled={isSaving}
                onChange={(event) => onHookChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-preview-caption">Caption</Label>
              <Textarea
                id="video-preview-caption"
                value={captionValue}
                disabled={isSaving}
                rows={8}
                onChange={(event) => onCaptionChange(event.target.value)}
              />
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            {slideNotes.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Slide Notes
                </p>
                <div className="mt-2 space-y-2">
                  {slideNotes.map((slide, index) => (
                    <p key={slide.key} className="text-xs text-muted-foreground">
                      {index + 1}. {slide.header}: {slide.content}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur supports-backdrop-filter:bg-background/90 xl:shrink-0">
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={onSave}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
