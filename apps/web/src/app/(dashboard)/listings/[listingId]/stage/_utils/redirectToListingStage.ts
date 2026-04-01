import { redirect } from "next/navigation";
import {
  canAccessListingStage,
  resolveListingResumePath
} from "@web/src/components/listings/stage/shared/domain/helpers";

type ListingStage =
  | "categorize"
  | "complete"
  | "generate"
  | "review"
  | "upload";

const STAGE_PATHS: Record<ListingStage, (id: string) => string> = {
  categorize: (id) => `/listings/${id}/stage/categorize`,
  complete: (id) => `/listings/${id}/content`,
  generate: (id) => `/listings/${id}/stage/generate`,
  review: (id) => `/listings/${id}/stage/review`,
  upload: (id) => `/listings/${id}/stage/upload`
};

export function enforceListingStageAccess(
  listingId: string,
  stage: string,
  requestedStage: Exclude<ListingStage, "complete">,
  fallback = `/listings/${listingId}/stage/categorize`
): void {
  if (stage === "complete") {
    redirect(STAGE_PATHS.complete(listingId));
  }

  if (canAccessListingStage(stage, requestedStage)) {
    return;
  }

  if (stage in STAGE_PATHS) {
    redirect(resolveListingResumePath({ id: listingId, listingStage: stage }));
  }

  redirect(fallback);
}

export function redirectToListingStage(
  listingId: string,
  stage: string,
  requestedStage: ListingStage,
  fallback = `/listings/${listingId}/stage/categorize`
): void {
  if (requestedStage === "complete") {
    if (stage === "complete") {
      return;
    }
    if (stage in STAGE_PATHS) {
      redirect(resolveListingResumePath({ id: listingId, listingStage: stage }));
    }
    redirect(fallback);
  }

  enforceListingStageAccess(
    listingId,
    stage,
    requestedStage as Exclude<ListingStage, "complete">,
    fallback
  );
}
