import { redirect } from "next/navigation";
import { MediaView } from "../../components/media/MediaView";
import { getUser } from "@web/src/server/actions/db/users";
import { getUserMedia } from "@web/src/server/actions/db/userMedia";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import { getSignedDownloadUrlSafe } from "@web/src/server/utils/storageUrls";
import { getPaymentPlanLabel, getUserDisplayNames } from "@web/src/lib/userDisplay";

export default async function MediaPage() {
  const user = await getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const userAdditional = await getOrCreateUserAdditional(user.id);
  const userMedia = await getUserMedia(user.id);
  const signedUserMediaUrls = await Promise.all(
    userMedia.map((media) => getSignedDownloadUrlSafe(media.url))
  );
  const signedUserMedia = userMedia.map((media, index) => ({
    ...media,
    url: signedUserMediaUrls[index] ?? media.url
  }));
  const { sidebarName } = getUserDisplayNames(user);
  const paymentPlanLabel = getPaymentPlanLabel(userAdditional.paymentPlan);

  return (
    <MediaView
      userId={user.id}
      initialMedia={signedUserMedia}
      userName={sidebarName}
      paymentPlan={paymentPlanLabel}
      userAvatar={user.profileImageUrl ?? undefined}
    />
  );
}
