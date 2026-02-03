"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListingViewHeader } from "./ListingViewHeader";
import { Button } from "../ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { fetchListingPropertyDetails } from "@web/src/server/actions/api/listingProperty";
import { updateListing } from "@web/src/server/actions/db/listings";
import { toast } from "sonner";

type ListingPropertyProcessingViewProps = {
  listingId: string;
  userId: string;
  title: string;
  address: string;
};

export function ListingPropertyProcessingView({
  listingId,
  userId,
  title,
  address
}: ListingPropertyProcessingViewProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fetchDetails = React.useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await fetchListingPropertyDetails(userId, listingId, address);
      setStatus("success");
      router.replace(`/listings/${listingId}/review`);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to fetch details."
      );
    }
  }, [address, listingId, router, userId]);

  React.useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  const handleSkip = async () => {
    try {
      await updateListing(userId, listingId, { listingStage: "review" });
      router.replace(`/listings/${listingId}/review`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to skip fetch."
      );
    }
  };

  return (
    <>
      <ListingViewHeader title={title} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-8 py-10">
        <div className="mx-auto w-full max-w-[520px] space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-border bg-secondary/60">
            {status === "error" ? (
              <AlertTriangle size={32} className="text-destructive" />
            ) : (
              <Loader2 size={32} className="text-foreground animate-spin" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-header text-foreground">
              {status === "error"
                ? "Property lookup failed"
                : "Fetching property details"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {status === "error"
                ? "We could not fetch IDX details. You can retry or fill in details manually."
                : "We’re pulling public IDX, tax, and listing records for review."}
            </p>
            <p className="text-xs text-muted-foreground">
              {address || "Address on file"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary p-6 text-left space-y-4">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs">
                ✓
              </span>
              <span className="flex-1">Upload complete</span>
              <span className="text-xs text-muted-foreground">Done</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border">
                {status === "error" ? (
                  <AlertTriangle size={14} className="text-destructive" />
                ) : (
                  <Loader2 size={14} className="text-foreground animate-spin" />
                )}
              </div>
              <span className="flex-1">Fetching property details</span>
              <span className="text-xs text-muted-foreground">
                {status === "success" ? "Done" : "In progress"}
              </span>
            </div>
            {status === "error" ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                {errorMessage ?? "Failed to fetch property details."}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              This usually takes a few moments. Please keep this tab open.
            </p>
          </div>

          {status === "error" ? (
            <div className="flex flex-col gap-2">
              <Button onClick={fetchDetails}>Retry fetch</Button>
              <Button variant="outline" onClick={handleSkip}>
                Review manually
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
