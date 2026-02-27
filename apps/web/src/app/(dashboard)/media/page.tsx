import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { MediaView } from "@web/src/components/media";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { getUserMediaForCurrentUser } from "@web/src/server/actions/media";

export default async function MediaPage() {
  return runWithCaller("media", async () => {
    await requireUserOrRedirect();
    const mediaWithPublicUrls = await getUserMediaForCurrentUser();
    return <MediaView initialMedia={mediaWithPublicUrls} />;
  });
}
