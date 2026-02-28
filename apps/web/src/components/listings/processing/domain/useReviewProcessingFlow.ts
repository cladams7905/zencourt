import * as React from "react";
import { toast } from "sonner";
import { fetchPropertyDetails } from "./transport";

export function useReviewProcessingFlow(params: {
  mode: "categorize" | "review" | "generate";
  listingId: string;
  address?: string | null;
  navigate: (url: string) => void;
  updateStage: (stage: "review" | "create") => Promise<void>;
}) {
  const { mode, listingId, address, navigate, updateStage } = params;
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const lastAutoFetchKeyRef = React.useRef<string | null>(null);

  const fetchDetails = React.useCallback(async () => {
    if (mode !== "review") return;
    setStatus("loading");
    setErrorMessage(null);
    try {
      await fetchPropertyDetails(listingId, address ?? null);
      setStatus("success");
      navigate(`/listings/${listingId}/review`);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to fetch details.");
    }
  }, [address, listingId, mode, navigate]);

  React.useEffect(() => {
    if (mode !== "review") return;

    const autoFetchKey = `${listingId}:${address ?? ""}`;
    if (lastAutoFetchKeyRef.current === autoFetchKey) return;

    lastAutoFetchKeyRef.current = autoFetchKey;
    void fetchDetails();
  }, [address, fetchDetails, listingId, mode]);

  const handleSkip = React.useCallback(async () => {
    try {
      await updateStage("review");
      navigate(`/listings/${listingId}/review`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to skip fetch.");
    }
  }, [listingId, navigate, updateStage]);

  return {
    status,
    errorMessage,
    fetchDetails,
    handleSkip
  };
}
