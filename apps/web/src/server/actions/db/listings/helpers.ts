import type { DBContent } from "@db/types/models";
import { resolvePublicDownloadUrl } from "@web/src/server/utils/storageUrls";

export async function withSignedContentThumbnails(
  contentList: DBContent[]
): Promise<DBContent[]> {
  if (!contentList || contentList.length === 0) {
    return contentList;
  }

  return contentList.map((item) => ({
    ...item,
    thumbnailUrl:
      resolvePublicDownloadUrl(item.thumbnailUrl) ?? item.thumbnailUrl
  }));
}
