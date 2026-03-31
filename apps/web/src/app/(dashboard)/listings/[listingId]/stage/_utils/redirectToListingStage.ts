import { redirect } from "next/navigation";

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

/**
 * If `stage` does not match `expectedStage`, redirects to the path for
 * `stage`. Pass a `fallback` URL for when `stage` is not a recognised value.
 */
export function redirectToListingStage(
  listingId: string,
  stage: string,
  expectedStage: ListingStage,
  fallback = `/listings/${listingId}/stage/categorize`
): void {
  if (stage === expectedStage) return;

  const pathFn = STAGE_PATHS[stage as ListingStage];
  redirect(pathFn ? pathFn(listingId) : fallback);
}
