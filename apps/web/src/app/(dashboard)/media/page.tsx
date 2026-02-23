import { MediaView } from "@web/src/components/media";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { getUserMedia } from "@web/src/server/actions/db/userMedia";
import { getPublicDownloadUrlSafe } from "@web/src/server/utils/storageUrls";

export default async function MediaPage() {
  const user = await requireUserOrRedirect();

  const userMedia = await getUserMedia(user.id);
  const mediaWithPublicUrls = userMedia.map((media) => ({
    ...media,
    url: getPublicDownloadUrlSafe(media.url) ?? media.url,
    thumbnailUrl: getPublicDownloadUrlSafe(media.thumbnailUrl) ?? media.thumbnailUrl
  }));
  return (
    <MediaView
      userId={user.id}
      initialMedia={mediaWithPublicUrls}
    />
  );
}
