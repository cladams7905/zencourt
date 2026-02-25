import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { MediaView } from "@web/src/components/media";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { getUserMedia } from "@web/src/server/models/userMedia";
import { getPublicDownloadUrlSafe } from "@web/src/server/services/storage/urlResolution";

export default async function MediaPage() {
  return runWithCaller("media", async () => {
    const user = await requireUserOrRedirect();

    const userMedia = await getUserMedia(user.id);
    const mediaWithPublicUrls = userMedia.map((media) => ({
      ...media,
      url: getPublicDownloadUrlSafe(media.url) ?? media.url,
      thumbnailUrl:
        getPublicDownloadUrlSafe(media.thumbnailUrl) ?? media.thumbnailUrl
    }));
    return <MediaView initialMedia={mediaWithPublicUrls} />;
  });
}
