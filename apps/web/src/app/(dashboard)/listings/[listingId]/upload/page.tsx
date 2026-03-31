import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingUploadView } from "@web/src/components/listings/upload";

interface ListingUploadPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingUploadPage({ params }: ListingUploadPageProps) {
  return runWithCaller("listings/[id]/upload", async () => {
    const { listingId } = await params;
    const user = await requireUserOrRedirect();

    if (!listingId?.trim()) {
      redirect("/listings/create");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/create");
    }

    return <ListingUploadView listingId={listingId} />;
  });
}
