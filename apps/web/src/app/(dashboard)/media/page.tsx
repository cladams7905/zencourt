import { redirect } from "next/navigation";
import { MediaView } from "@web/src/components/media";
import { getUser } from "@web/src/server/actions/db/users";
import { getUserMedia } from "@web/src/server/actions/db/userMedia";
import { getSignedDownloadUrlSafe } from "@web/src/server/utils/storageUrls";

export default async function MediaPage() {
  const user = await getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const userMedia = await getUserMedia(user.id);
  const signedUserMediaUrls = await Promise.all(
    userMedia.map((media) =>
      Promise.all([
        getSignedDownloadUrlSafe(media.url),
        getSignedDownloadUrlSafe(media.thumbnailUrl ?? undefined)
      ])
    )
  );
  const signedUserMedia = userMedia.map((media, index) => ({
    ...media,
    url: signedUserMediaUrls[index]?.[0] ?? media.url,
    thumbnailUrl: signedUserMediaUrls[index]?.[1] ?? media.thumbnailUrl
  }));
  return (
    <MediaView
      userId={user.id}
      initialMedia={signedUserMedia}
    />
  );
}
