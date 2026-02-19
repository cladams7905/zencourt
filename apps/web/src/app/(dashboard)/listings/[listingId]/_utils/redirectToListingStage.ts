import { redirect } from "next/navigation";

type ListingStage = "categorize" | "create" | "generate" | "review";

const STAGE_PATHS: Record<ListingStage, (id: string) => string> = {
  categorize: (id) => `/listings/${id}/categorize`,
  create: (id) => `/listings/${id}/create`,
  generate: (id) => `/listings/${id}/generate`,
  review: (id) => `/listings/${id}/review`
};

/**
 * If `stage` does not match `expectedStage`, redirects to the path for
 * `stage`. Pass a `fallback` URL for when `stage` is not a recognised value.
 */
export function redirectToListingStage(
  listingId: string,
  stage: string,
  expectedStage: ListingStage,
  fallback = `/listings/${listingId}/categorize`
): void {
  if (stage === expectedStage) return;

  const pathFn = STAGE_PATHS[stage as ListingStage];
  redirect(pathFn ? pathFn(listingId) : fallback);
}
