import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { ListingSyncView } from "@web/src/components/listings/sync";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";

export default async function ListingSyncPage() {
  return runWithCaller("listings/sync", async () => {
    await requireUserOrRedirect();
    return <ListingSyncView />;
  });
}
