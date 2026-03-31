import { redirect } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import {
  ListingClipManager,
  ListingClipManagerBackButton
} from "@web/src/components/listings/content/clipManager/ListingClipManager";
import { ViewHeader } from "@web/src/components/view/ViewHeader";
import { redirectToListingStage } from "../../stage/_utils/redirectToListingStage";
import { getListingClipVersionItemsForCurrentUser } from "@web/src/server/actions/listings/clips";
import { stringifyListingContentSearchParams } from "@web/src/components/listings/content/domain/query";

interface ListingContentClipsPageProps {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ListingContentClipsPage({
  params,
  searchParams
}: ListingContentClipsPageProps) {
  return runWithCaller("listings/[id]/content/clips", async () => {
    const { listingId } = await params;
    const resolvedSearchParams = (await searchParams) ?? {};
    const user = await requireUserOrRedirect();

    if (!listingId?.trim()) {
      redirect("/listings/create");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/create");
    }

    redirectToListingStage(listingId, listing.listingStage, "complete");

    const clipVersionItems =
      await getListingClipVersionItemsForCurrentUser(listingId);
    const query = stringifyListingContentSearchParams(resolvedSearchParams);
    const backHref = query
      ? `/listings/${listingId}/content?${query}`
      : `/listings/${listingId}/content`;

    const listingTitle = listing.title?.trim() || "Listing";

    return (
      <>
        <ViewHeader title={listingTitle} listingView />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-8 space-y-4 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ListingClipManagerBackButton href={backHref} />
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Clapperboard className="h-3.5 w-3.5" aria-hidden />
              {clipVersionItems.length} clips
            </div>
          </div>
          <ListingClipManager
            listingId={listingId}
            items={clipVersionItems}
            mode="workspace"
          />
        </div>
      </>
    );
  });
}
