import { redirect } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import {
  ListingClipManager,
  ListingClipManagerBackButton
} from "@web/src/components/listings/create/components/ListingClipManager";
import { ListingViewHeader } from "@web/src/components/listings/shared";
import { redirectToListingStage } from "../../_utils/redirectToListingStage";
import { getListingClipVersionItemsForCurrentUser } from "@web/src/server/actions/listings/clips";
import { stringifyListingCreateSearchParams } from "@web/src/components/listings/create/domain/listingCreate";

interface ListingCreateClipsPageProps {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ListingCreateClipsPage({
  params,
  searchParams
}: ListingCreateClipsPageProps) {
  return runWithCaller("listings/[id]/create/clips", async () => {
    const { listingId } = await params;
    const resolvedSearchParams = (await searchParams) ?? {};
    const user = await requireUserOrRedirect();

    if (!listingId?.trim()) {
      redirect("/listings/sync");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/sync");
    }

    redirectToListingStage(listingId, listing.listingStage, "create");

    const clipVersionItems =
      await getListingClipVersionItemsForCurrentUser(listingId);
    const query = stringifyListingCreateSearchParams(resolvedSearchParams);
    const backHref = query
      ? `/listings/${listingId}/create?${query}`
      : `/listings/${listingId}/create`;

    const listingTitle = listing.title?.trim() || "Listing";

    return (
      <>
        <ListingViewHeader title={listingTitle} />
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
