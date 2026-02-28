"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListingViewHeader } from "@web/src/components/listings/shared";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog";
import { useListingProcessingWorkflow } from "@web/src/components/listings/processing/domain";

type ListingProcessingViewProps = {
  mode: "categorize" | "review" | "generate";
  listingId: string;
  userId: string;
  title: string;
  address?: string | null;
  batchCount?: number | null;
  batchStartedAt?: number | null;
};

export function ListingProcessingView({
  mode,
  listingId,
  title,
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
    address,
    batchStartedAt,
    navigate
  });

  return (
    <>
      <ListingViewHeader title={title} />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-5xl items-center justify-center px-8 py-10">
        <div className="w-full max-w-[520px] space-y-6 text-center bg-background shadow-xs hover:shadow-md transition-all border border-border p-6 rounded-xl">
          <div className="mx-auto mt-2 flex items-center justify-center">
            {mode === "review" && status === "error" ? (
              <AlertTriangle size={32} className="text-destructive" />
            ) : (
              <Loader2 size={40} className="text-foreground animate-spin" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-header text-foreground">{copy.title}</h2>
            <div className="my-3 gap-3">
              <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
              {copy.addressLine ? (
                <p className="text-xs mt-1 text-muted-foreground">{copy.addressLine}</p>
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
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Cancel video generation?</DialogTitle>
            <DialogDescription>
              This will stop all in-flight video jobs for this listing. You can
              restart generation later.
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
