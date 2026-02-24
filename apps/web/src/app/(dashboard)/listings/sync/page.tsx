import { ListingSyncView } from "@web/src/components/listings/sync";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";

export default async function ListingSyncPage() {
  await requireUserOrRedirect();
  return <ListingSyncView />;
}
