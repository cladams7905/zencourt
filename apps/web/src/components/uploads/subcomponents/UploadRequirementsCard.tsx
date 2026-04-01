"use client";

import { Check } from "lucide-react";

type UploadRequirementsCardProps = {
  requirements: string[];
};

export function UploadRequirementsCard({
  requirements
}: UploadRequirementsCardProps) {
  if (!requirements.length) {
    return null;
  }

  return (
    <div className="w-full min-w-0 max-w-full shrink-0 rounded-lg border border-border bg-background/60 p-3 text-left">
      <div className="grid w-full min-w-0 grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {requirements.map((requirement) => (
          <div
            key={requirement}
            className="flex min-w-0 items-start gap-2 text-xs text-muted-foreground"
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-2.5 w-2.5" />
            </span>
            <span className="min-w-0 wrap-break-word">{requirement}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
