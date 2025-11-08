"use client";

import { cn } from "../ui/utils";
import { Check, Loader2, Circle, AlertCircle } from "lucide-react";
import { Progress } from "../ui/progress";
import type { GenerationStep } from "../../types/workflow";

interface GenerationStepItemProps {
  step: GenerationStep;
}

export function GenerationStepItem({ step }: GenerationStepItemProps) {
  return (
    <div className="flex items-start gap-4">
      {/* Status Icon */}
      <div className="flex-shrink-0 relative">
        {step.status === "completed" && (
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
        )}

        {step.status === "in-progress" && (
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {step.status === "waiting" && (
          <div className="w-10 h-10 rounded-full border-2 border-muted bg-background flex items-center justify-center">
            <Circle className="w-4 h-4 text-muted-foreground fill-muted-foreground/30" />
          </div>
        )}

        {step.status === "failed" && (
          <div className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-w-0 pt-1">
        {/* Label */}
        <h4
          className={cn(
            "font-semibold text-sm",
            step.status === "completed" && "text-foreground",
            step.status === "in-progress" && "text-primary",
            step.status === "waiting" && "text-muted-foreground",
            step.status === "failed" && "text-destructive"
          )}
        >
          {step.label}
        </h4>

        {/* Status Message */}
        <div className="mt-1">
          {step.status === "completed" && step.duration !== undefined && (
            <p className="text-xs text-muted-foreground">
              Completed in {formatDuration(step.duration)}
            </p>
          )}

          {step.status === "in-progress" && (
            <div className="space-y-2 mt-2">
              {step.progress !== undefined && (
                <>
                  <Progress value={step.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {Math.round(step.progress)}% complete
                  </p>
                </>
              )}
              {step.progress === undefined && (
                <p className="text-xs text-muted-foreground">Processing...</p>
              )}
            </div>
          )}

          {step.status === "waiting" && (
            <p className="text-xs text-muted-foreground">Waiting...</p>
          )}

          {step.status === "failed" && step.error && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-xs text-destructive">{step.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}
