import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { ListingUploadView } from "@web/src/components/listings/upload";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";

export default async function ListingUploadPage() {
  return runWithCaller("listings/upload", async () => {
    await requireUserOrRedirect();
    return <ListingUploadView />;
  });
}
