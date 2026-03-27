import {
  db,
  userMedia,
  and,
  desc,
  eq,
  inArray,
  lt,
  or,
  sql
} from "@db/client";
import type { DBUserMedia } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { requireUserId } from "@web/src/server/models/shared/validation";

const USER_MEDIA_VIDEO_PAGE_MAX = 50;

export type UserMediaVideoPageCursorPayload = {
  u: string;
  i: string;
};

export function encodeUserMediaVideoPageCursor(row: {
  uploadedAt: Date;
  id: string;
}): string {
  const payload: UserMediaVideoPageCursorPayload = {
    u: row.uploadedAt.toISOString(),
    i: row.id
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeUserMediaVideoPageCursor(
  cursor: string
): { uploadedAtIso: string; id: string } | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as UserMediaVideoPageCursorPayload;
    if (typeof parsed.u !== "string" || typeof parsed.i !== "string") {
      return null;
    }
    return { uploadedAtIso: parsed.u, id: parsed.i };
  } catch {
    return null;
  }
}

export async function getUserMedia(userId: string): Promise<DBUserMedia[]> {
  requireUserId(userId, "User ID is required to fetch media");

  return withDbErrorHandling(
    async () => {
      return db
        .select()
        .from(userMedia)
        .where(eq(userMedia.userId, userId))
        .orderBy(desc(userMedia.uploadedAt));
    },
    {
      actionName: "getUserMedia",
      context: { userId },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}

export async function countUserMediaVideos(userId: string): Promise<number> {
  requireUserId(userId, "User ID is required to fetch media");

  return withDbErrorHandling(
    async () => {
      const [row] = await db
        .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
        .from(userMedia)
        .where(and(eq(userMedia.userId, userId), eq(userMedia.type, "video")));
      return row?.n ?? 0;
    },
    {
      actionName: "countUserMediaVideos",
      context: { userId },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}

export async function getUserMediaVideoPage(
  userId: string,
  options: { limit: number; cursor?: string | null }
): Promise<{
  items: DBUserMedia[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  requireUserId(userId, "User ID is required to fetch media");

  const limit = Math.min(
    Math.max(1, Math.floor(options.limit)),
    USER_MEDIA_VIDEO_PAGE_MAX
  );
  const decoded = options.cursor?.trim()
    ? decodeUserMediaVideoPageCursor(options.cursor.trim())
    : null;
  if (options.cursor?.trim() && !decoded) {
    return {
      items: [],
      nextCursor: null,
      hasMore: false
    };
  }

  return withDbErrorHandling(
    async () => {
      const base = and(
        eq(userMedia.userId, userId),
        eq(userMedia.type, "video")
      );
      const cursorDate = decoded ? new Date(decoded.uploadedAtIso) : null;
      const cursorWhere =
        decoded && cursorDate && !Number.isNaN(cursorDate.getTime())
          ? or(
              lt(userMedia.uploadedAt, cursorDate),
              and(
                eq(userMedia.uploadedAt, cursorDate),
                lt(userMedia.id, decoded.id)
              )
            )
          : undefined;

      const whereClause = cursorWhere ? and(base, cursorWhere) : base;

      const rows = await db
        .select()
        .from(userMedia)
        .where(whereClause)
        .orderBy(desc(userMedia.uploadedAt), desc(userMedia.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const last = items[items.length - 1];
      const nextCursor =
        hasMore && last
          ? encodeUserMediaVideoPageCursor({
              uploadedAt: last.uploadedAt as Date,
              id: last.id
            })
          : null;

      return { items, nextCursor, hasMore };
    },
    {
      actionName: "getUserMediaVideoPage",
      context: { userId, limit, hasCursor: Boolean(options.cursor) },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}

export async function getUserMediaByIds(
  userId: string,
  mediaIds: string[]
): Promise<DBUserMedia[]> {
  requireUserId(userId, "User ID is required to fetch media");

  const uniqueIds = Array.from(
    new Set(
      mediaIds.filter((id) => typeof id === "string" && id.trim().length > 0)
    )
  );
  if (uniqueIds.length === 0) {
    return [];
  }

  return withDbErrorHandling(
    async () => {
      return db
        .select()
        .from(userMedia)
        .where(
          and(eq(userMedia.userId, userId), inArray(userMedia.id, uniqueIds))
        )
        .orderBy(desc(userMedia.uploadedAt), desc(userMedia.id));
    },
    {
      actionName: "getUserMediaByIds",
      context: { userId, idCount: uniqueIds.length },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}

export async function getUserMediaById(
  userId: string,
  mediaId: string
): Promise<DBUserMedia | null> {
  requireUserId(userId, "User ID is required to fetch media");

  return withDbErrorHandling(
    async () => {
      const [row] = await db
        .select()
        .from(userMedia)
        .where(eq(userMedia.id, mediaId))
        .limit(1);
      if (!row || row.userId !== userId) {
        return null;
      }
      return row as DBUserMedia;
    },
    {
      actionName: "getUserMediaById",
      context: { userId, mediaId },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}
