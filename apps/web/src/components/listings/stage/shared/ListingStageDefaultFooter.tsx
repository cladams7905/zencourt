"use client";

import { useRouter } from "next/navigation";
import { ListingStageFooter } from "@web/src/components/listings/stage/shared/ListingStageFooter";
import { useListingStageViewContext } from "@web/src/components/listings/stage/shared/ListingStageViewContext";

/**
 * Router-driven footer for stages that only need default navigation (e.g. upload).
 * Other stages pass an explicit `footer` to {@link ListingStageShell}.
 */
export function ListingStageDefaultFooter() {
  const router = useRouter();
  const { stage, listingId } = useListingStageViewContext();

  if (stage !== "upload" || !listingId?.trim()) {
    return null;
  }

  return (
    <ListingStageFooter
      onBack={() =>
        router.push(
          `/listings/create?listingId=${encodeURIComponent(listingId)}`
        )
      }
      onContinue={() =>
        router.push(`/listings/${listingId}/stage/plan`)
      }
      canContinue
      canBack
    />
  );
}
