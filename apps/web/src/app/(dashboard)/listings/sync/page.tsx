import { redirect } from "next/navigation";
import { ListingSyncView } from "@web/src/components/listings/ListingSyncView";
import { getUser } from "@web/src/server/actions/db/users";

export default async function ListingSyncPage() {
  const user = await getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  return <ListingSyncView />;
}
