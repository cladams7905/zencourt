import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@web/src/components/ui/dialog";
import type { ListingPropertyDetails } from "@shared/types/models";

type SourceEntry = NonNullable<ListingPropertyDetails["sources"]>[number];

type ReviewSourcesDialogProps = {
  sources: SourceEntry[];
};

export const ReviewSourcesDialog = ({
  sources
}: ReviewSourcesDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          Sources
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Property data sources</DialogTitle>
          <DialogDescription>
            Links to the pages used to populate this listing.
          </DialogDescription>
        </DialogHeader>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sources captured yet.</p>
        ) : (
          <div className="space-y-3">
            {sources.map((entry, index) => (
              <div
                key={`source-link-${index}`}
                className="rounded-md border border-border bg-secondary/40 px-3 py-2"
              >
                <div className="text-sm font-medium text-foreground">
                  {entry.citation ? (
                    <a
                      href={entry.citation}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-foreground underline decoration-border/70 underline-offset-4 hover:text-muted-foreground"
                    >
                      {entry.site ?? `Source ${index + 1}`}
                    </a>
                  ) : (
                    <span>{entry.site ?? `Source ${index + 1}`}</span>
                  )}
                </div>
                {entry.notes ? (
                  <p className="text-xs text-muted-foreground">{entry.notes}</p>
                ) : null}
                {!entry.citation ? (
                  <p className="mt-2 text-xs text-muted-foreground">No URL provided.</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
