import * as React from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@web/src/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@web/src/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import { cn } from "@web/src/components/ui/utils";
import type { ReelTextRegenerationField } from "@web/src/lib/domain/listings/content/reels";

const FIELD_LABEL: Record<ReelTextRegenerationField, string> = {
  hook: "header",
  caption: "caption"
};

export function ReelTextRegenerateControl({
  field,
  isSubmitting,
  onRandomRegenerate,
  onCustomRegenerate
}: {
  field: ReelTextRegenerationField;
  isSubmitting: boolean;
  onRandomRegenerate: () => void;
  onCustomRegenerate: (directions: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [isCustomizeExpanded, setIsCustomizeExpanded] = React.useState(false);
  const [directions, setDirections] = React.useState("");
  const label = FIELD_LABEL[field];

  function closeMenu() {
    setOpen(false);
    setIsCustomizeExpanded(false);
    setDirections("");
  }

  function handleRandomRegenerate() {
    onRandomRegenerate();
    closeMenu();
  }

  function handleCustomRegenerate() {
    onCustomRegenerate(directions);
    closeMenu();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setIsCustomizeExpanded(false);
          setDirections("");
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Regenerate ${label}`}
              disabled={isSubmitting}
              className="h-7 w-7 shrink-0 rounded-full"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{`Regenerate ${label}`}</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        className={cn(
          "z-50 overflow-hidden rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-xl",
          isCustomizeExpanded ? "w-[min(28rem,calc(100vw-1.5rem))]" : "w-72"
        )}
      >
        {!isCustomizeExpanded ? (
          <div className="py-0">
            <button
              type="button"
              className="flex w-full cursor-pointer flex-col items-start gap-1 rounded-none px-4 py-2.5 text-left text-sm outline-none transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:bg-secondary focus-visible:text-secondary-foreground"
              onClick={handleRandomRegenerate}
              disabled={isSubmitting}
            >
              <span className="font-medium text-foreground">
                Random regenerate
              </span>
              <span className="text-xs text-muted-foreground">
                Generate another {label} using the standard reel prompt.
              </span>
            </button>
            <div className="h-px w-full shrink-0 bg-border/50" />
            <button
              type="button"
              className="flex w-full cursor-pointer flex-col items-start gap-1 rounded-none px-4 py-2.5 text-left text-sm outline-none transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:bg-secondary focus-visible:text-secondary-foreground"
              onClick={() => setIsCustomizeExpanded(true)}
              disabled={isSubmitting}
            >
              <span className="font-medium text-foreground">Custom prompt</span>
              <span className="text-xs text-muted-foreground">
                Provide custom directions for the regenerated {label}.
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 px-4 py-3">
            <div>
              <p className="text-base font-semibold text-foreground">
                Custom prompt
              </p>
            </div>
            <div>
              <label
                htmlFor={`reel-regenerate-directions-${field}`}
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Directions
              </label>
              <textarea
                id={`reel-regenerate-directions-${field}`}
                value={directions}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                placeholder={`Optional: add custom directions for the ${label}.`}
                onChange={(event) => setDirections(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomizeExpanded(false)}
              >
                Back
              </Button>
              <Button type="button" onClick={handleCustomRegenerate}>
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
