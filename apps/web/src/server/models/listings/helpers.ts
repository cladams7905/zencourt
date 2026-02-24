import type { DBContent } from "@db/types/models";

export async function withSignedContentThumbnails(
  contentList: DBContent[]
): Promise<DBContent[]> {
  return contentList;
}
