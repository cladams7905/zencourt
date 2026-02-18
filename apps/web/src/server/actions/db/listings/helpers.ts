import type { DBContent } from "@shared/types/models";
import {
  DEFAULT_THUMBNAIL_TTL_SECONDS,
  resolveSignedDownloadUrl
} from "@web/src/server/utils/storageUrls";

export async function withSignedContentThumbnails(
  contentList: DBContent[]
): Promise<DBContent[]> {
  if (!contentList || contentList.length === 0) {
    return contentList;
  }

  return Promise.all(
    contentList.map(async (item) => ({
      ...item,
      thumbnailUrl: await resolveSignedDownloadUrl(
        item.thumbnailUrl,
        DEFAULT_THUMBNAIL_TTL_SECONDS
      )
    }))
  );
}
