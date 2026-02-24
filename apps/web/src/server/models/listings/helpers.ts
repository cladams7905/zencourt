import type { DBContent } from "@db/types/models";
import { resolvePublicDownloadUrl } from "@web/src/server/services/storage/urlResolution";

export async function withSignedContentThumbnails(
  contentList: DBContent[]
): Promise<DBContent[]> {
  if (contentList.length === 0) {
    return [];
  }
  const resolved = await Promise.all(
    contentList.map(async (item) => {
      const resolvedUrl = resolvePublicDownloadUrl(item.thumbnailUrl ?? null);
      return {
        ...item,
        thumbnailUrl: resolvedUrl ?? item.thumbnailUrl
      };
    })
  );
  return resolved;
}
