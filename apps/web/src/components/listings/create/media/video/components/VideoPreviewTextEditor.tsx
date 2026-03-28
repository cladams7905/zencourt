import * as React from "react";
import {
  OVERLAY_FONT_PAIRINGS,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR
} from "@shared/utils";
import { Button } from "@web/src/components/ui/button";
import { Input } from "@web/src/components/ui/input";
import { Label } from "@web/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@web/src/components/ui/select";
import { Switch } from "@web/src/components/ui/switch";
import { Textarea } from "@web/src/components/ui/textarea";
import { cn } from "@web/src/components/ui/utils";
import {
  type OverlayOption,
  type ReelOverlayDraft,
  VIDEO_PREVIEW_OVERLAY_BACKGROUND_OPTIONS,
  VIDEO_PREVIEW_OVERLAY_FONT_OPTIONS,
  VIDEO_PREVIEW_OVERLAY_POSITION_OPTIONS
} from "../videoPreviewOverlayControls";

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
  isDirty: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  onHookChange: (value: string) => void;
  onCaptionChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  overlayDraft: ReelOverlayDraft;
  backgroundOptions?: readonly OverlayOption<ReelOverlayDraft["background"]>[];
  fontOptions?: readonly OverlayOption<ReelOverlayDraft["fontPairing"]>[];
  positionOptions?: readonly OverlayOption<ReelOverlayDraft["position"]>[];
  onOverlayBackgroundChange: (value: ReelOverlayDraft["background"]) => void;
  onOverlayFontChange: (value: ReelOverlayDraft["fontPairing"]) => void;
  onOverlayPositionChange: (value: ReelOverlayDraft["position"]) => void;
  onOverlayAddressToggle: (value: boolean) => void;
};

export function VideoPreviewTextEditor({
  hookValue,
  captionValue,
  isDirty,
  isSaving,
  errorMessage,
  onHookChange,
  onCaptionChange,
  onCancel,
  onSave,
  overlayDraft,
  backgroundOptions = VIDEO_PREVIEW_OVERLAY_BACKGROUND_OPTIONS,
  fontOptions = VIDEO_PREVIEW_OVERLAY_FONT_OPTIONS,
  positionOptions = VIDEO_PREVIEW_OVERLAY_POSITION_OPTIONS,
  onOverlayBackgroundChange,
  onOverlayFontChange,
  onOverlayPositionChange,
  onOverlayAddressToggle
}: VideoPreviewTextEditorProps) {
  function handleBackgroundChange(value: ReelOverlayDraft["background"]) {
    onOverlayBackgroundChange(value);
  }

  function handleFontChange(value: ReelOverlayDraft["fontPairing"]) {
    onOverlayFontChange(value);
  }

  function handlePositionChange(value: ReelOverlayDraft["position"]) {
    onOverlayPositionChange(value);
  }

  function handleAddressChange(value: boolean) {
    onOverlayAddressToggle(value);
  }

  const selectedFontOption =
    fontOptions.find((option) => option.value === overlayDraft.fontPairing) ??
    fontOptions[0];
  const selectedFontFamily = selectedFontOption
    ? OVERLAY_FONT_PAIRINGS[selectedFontOption.value].body.fontFamily
    : undefined;

  return (
    <div className="min-h-0 rounded-lg bg-card min-[1050px]:flex min-[1050px]:h-full min-[1050px]:min-h-0 min-[1050px]:flex-col">
      <div className="min-[1050px]:min-h-0 min-[1050px]:flex-1 min-[1050px]:overflow-y-auto">
        <div className="p-4">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="video-preview-header" className="font-semibold">
                Header
              </Label>
              <Input
                id="video-preview-header"
                value={hookValue}
                disabled={isSaving}
                onChange={(event) => onHookChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-preview-caption" className="font-semibold">
                Caption
              </Label>
              <Textarea
                id="video-preview-caption"
                value={captionValue}
                disabled={isSaving}
                rows={8}
                onChange={(event) => onCaptionChange(event.target.value)}
              />
            </div>

            <section className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Overlay Style
                </p>
                <p className="text-sm text-muted-foreground">
                  Tune the text overlay style, background, and position.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Background
                </p>
                <div className="flex flex-wrap gap-2">
                  {backgroundOptions.map((option) => {
                    const isSelected = overlayDraft.background === option.value;
                    const isTransparentOption = option.value === "transparent";
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-label={option.label}
                        aria-pressed={isSelected}
                        disabled={isSaving}
                        onClick={() => handleBackgroundChange(option.value)}
                        className={cn(
                          "inline-flex size-9 items-center justify-center rounded-full border transition-all",
                          isSelected
                            ? "border-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                            : "border-border/70 hover:border-border hover:ring-1 hover:ring-border/60"
                        )}
                        title={option.label}
                      >
                        <span
                          aria-hidden="true"
                          className="size-6 rounded-full border border-background/60 shadow-sm"
                          style={
                            isTransparentOption
                              ? {
                                  backgroundImage: "url('/transparent.png')",
                                  backgroundPosition: "center",
                                  backgroundRepeat: "no-repeat",
                                  backgroundSize: "500%"
                                }
                              : {
                                  backgroundColor:
                                    PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR[
                                      option.value
                                    ]
                                }
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-preview-font" className="font-semibold">
                  Font
                </Label>
                <Select
                  value={overlayDraft.fontPairing}
                  onValueChange={handleFontChange}
                  disabled={isSaving}
                >
                  <SelectTrigger id="video-preview-font" className="w-full">
                    <SelectValue asChild>
                      <span
                        className="flex min-w-0 items-center gap-2"
                        style={
                          selectedFontFamily
                            ? { fontFamily: selectedFontFamily }
                            : undefined
                        }
                      >
                        <span className="shrink-0 text-sm text-muted-foreground">
                          Aa
                        </span>
                        <span className="truncate">
                          {selectedFontOption?.label}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((option) => {
                      const fontFamily =
                        OVERLAY_FONT_PAIRINGS[option.value].body.fontFamily;
                      return (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          itemText={
                            <span style={{ fontFamily }}>{option.label}</span>
                          }
                          itemContentOrder="childrenFirst"
                        >
                          <span
                            className="text-sm text-muted-foreground"
                            style={{ fontFamily }}
                          >
                            Aa
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="video-preview-position"
                  className="font-semibold"
                >
                  Position
                </Label>
                <Select
                  value={overlayDraft.position}
                  onValueChange={handlePositionChange}
                  disabled={isSaving}
                >
                  <SelectTrigger id="video-preview-position" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="video-preview-address"
                    className="font-semibold"
                  >
                    Show address
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle the supplemental address overlay.
                  </p>
                </div>
                <Switch
                  id="video-preview-address"
                  checked={overlayDraft.showAddress}
                  disabled={isSaving}
                  onCheckedChange={handleAddressChange}
                />
              </div>
            </section>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
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
