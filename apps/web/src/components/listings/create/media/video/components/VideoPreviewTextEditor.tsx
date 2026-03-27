import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import { Input } from "@web/src/components/ui/input";
import { Label } from "@web/src/components/ui/label";
import { Textarea } from "@web/src/components/ui/textarea";
import { cn } from "@web/src/components/ui/utils";

export function VideoPreviewEditorActions({
  isDirty,
  isSaving,
  onCancel,
  onSave,
  className,
  cancelButtonTestId,
  saveButtonTestId
}: {
  isDirty: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  className?: string;
  cancelButtonTestId?: string;
  saveButtonTestId?: string;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={isSaving}
        data-testid={cancelButtonTestId}
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type="button"
        disabled={!isDirty || isSaving}
        data-testid={saveButtonTestId}
        onClick={onSave}
      >
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

type VideoPreviewTextEditorProps = {
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
    <div className="min-h-0 rounded-lg bg-card min-[1050px]:flex min-[1050px]:h-full min-[1050px]:min-h-0 min-[1050px]:flex-col">
      <div className="min-[1050px]:min-h-0 min-[1050px]:flex-1 min-[1050px]:overflow-y-auto">
        <div className="p-4">
          <div className="space-y-5">
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
      <div className="hidden border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/90 min-[1050px]:sticky min-[1050px]:bottom-0 min-[1050px]:block min-[1050px]:shrink-0 min-[1050px]:p-4">
        <VideoPreviewEditorActions
          isDirty={isDirty}
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={onSave}
          cancelButtonTestId="reel-preview-cancel"
          saveButtonTestId="reel-preview-save"
        />
      </div>
    </div>
  );
}
