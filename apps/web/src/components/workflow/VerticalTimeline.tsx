"use client";

import { cn } from "../ui/utils";
import type { GenerationStep } from "../../types/workflow";
import { GenerationStepItem } from "./GenerationStepItem";

interface VerticalTimelineProps {
  steps: GenerationStep[];
  className?: string;
}

export function VerticalTimeline({ steps, className }: VerticalTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      <ol className="space-y-6" role="list" aria-label="Generation progress">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="relative">
              {/* Connecting line to next step */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-5 top-10 bottom-0 w-0.5 -mb-6",
                    step.status === "completed" && "bg-primary",
                    step.status === "in-progress" &&
                      "bg-gradient-to-b from-primary to-muted",
                    (step.status === "waiting" || step.status === "failed") &&
                      "bg-muted border-l border-dashed"
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step Item */}
              <GenerationStepItem step={step} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
