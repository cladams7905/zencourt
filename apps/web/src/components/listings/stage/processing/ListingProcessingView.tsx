"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../../ui/dialog";
import { useListingProcessingWorkflow } from "@web/src/components/listings/stage/processing/domain/hooks";
import {
  ListingStageFooter,
  ListingStageShell
} from "@web/src/components/listings/stage/shared";
import type { ListingStageKey } from "@web/src/components/listings/stage/shared/domain/stageSteps";

type ListingProcessingViewProps = {
  mode: "plan" | "review" | "generate";
  listingId: string;
  initialBatchId?: string | null;
  userId: string;
  address?: string | null;
  batchCount?: number | null;
  batchStartedAt?: number | null;
};

export function ListingProcessingView({
  mode,
  listingId,
  initialBatchId,
  address,
  batchStartedAt
}: ListingProcessingViewProps) {
  const router = useRouter();
  const navigate = React.useCallback(
    (url: string) => {
      router.replace(url);
    },
    [router]
  );

  const {
    copy,
    status,
    errorMessage,
    isCancelOpen,
    setIsCancelOpen,
    isCanceling,
    formattedEstimate,
    fetchDetails,
    handleSkip,
    handleCancelGeneration,
    isGenerateMode
  } = useListingProcessingWorkflow({
    mode,
    listingId,
    initialBatchId,
    address,
    batchStartedAt,
    navigate
  });

  const stageKey: ListingStageKey =
    mode === "plan"
      ? "plan"
      : mode === "review"
        ? "review"
        : "generate";

  const processingBackHref =
    mode === "plan"
      ? `/listings/${listingId}/stage/plan`
      : `/listings/${listingId}/stage/review`;

  return (
    <>
      <ListingStageShell
        stage={stageKey}
        wide
        footer={
          <ListingStageFooter
            onBack={() => router.push(processingBackHref)}
            canBack
          />
        }
      >
        <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full items-center justify-center py-6">
          <div className="w-full max-w-[520px] space-y-6 text-center bg-background shadow-xs hover:shadow-md transition-all border border-border p-6 rounded-xl">
            <div className="mx-auto mt-2 flex items-center justify-center">
              {mode === "review" && status === "error" ? (
                <AlertTriangle size={32} className="text-destructive" />
              ) : (
                <Loader2 size={40} className="text-foreground animate-spin" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-header text-foreground">
                {copy.title}
              </h2>
              <div className="my-3 gap-3">
                <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
                {copy.addressLine ? (
                  <p className="text-xs mt-1 text-muted-foreground">
                    {copy.addressLine}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="h-px bg-border w-full" />
            <p className="text-xs text-muted-foreground">{copy.helperText}</p>
            {isGenerateMode ? (
              <p className="text-xs text-muted-foreground font-semibold">
                Estimated time remaining: {formattedEstimate}
              </p>
            ) : null}
            {mode === "review" && status === "error" && errorMessage ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                {errorMessage}
              </div>
            ) : null}
            {mode === "review" && status === "error" ? (
              <div className="flex flex-col gap-2">
                <Button onClick={fetchDetails}>Retry fetch</Button>
                <Button variant="outline" onClick={handleSkip}>
                  Review manually
                </Button>
              </div>
            ) : null}
            {isGenerateMode ? (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setIsCancelOpen(true)}>
                  Cancel generation
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </ListingStageShell>
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Cancel video generation?</DialogTitle>
            <DialogDescription>
              This will stop the active video generation batch. You can restart
              generation later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCancelOpen(false)}
              disabled={isCanceling}
            >
              Keep running
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelGeneration}
              disabled={isCanceling}
            >
              {isCanceling ? "Canceling..." : "Cancel generation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
