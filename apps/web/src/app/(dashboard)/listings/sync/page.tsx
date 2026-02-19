import { ListingSyncView } from "@web/src/components/listings/sync";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";

export default async function ListingSyncPage() {
  const user = await requireUserOrRedirect();
  return <ListingSyncView userId={user.id} />;
}
