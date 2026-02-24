"use server";

import { db, eq, userAdditional } from "@db/client";
import storageService from "@web/src/server/services/storage";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { requireUserId } from "@web/src/server/models/shared/validation";
import { upsertUserAdditional } from "./helpers";

export async function ensureGoogleHeadshot(
  userId: string,
  googleImageUrl: string
): Promise<string | null> {
  requireUserId(userId, "User ID is required to update headshot");

  if (!googleImageUrl) {
    return null;
  }

  return withDbErrorHandling(
    async () => {
      const [existing] = await db
        .select({ headshotUrl: userAdditional.headshotUrl })
        .from(userAdditional)
        .where(eq(userAdditional.userId, userId));

      if (existing?.headshotUrl) {
        return existing.headshotUrl;
      }

      const response = await fetch(googleImageUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to download Google headshot");
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const extension = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";
      const fileName = `google-headshot.${extension}`;
      const buffer = await response.arrayBuffer();

      const uploadResult = await storageService.uploadFile({
        fileBuffer: buffer,
        fileName,
        contentType,
        options: {
          folder: `user_${userId}/branding`
        }
      });

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || "Headshot upload failed");
      }

      const record = await upsertUserAdditional(
        userId,
        {
          headshotUrl: uploadResult.url,
          updatedAt: new Date()
        },
        "Headshot could not be saved"
      );

      return record?.headshotUrl ?? uploadResult.url;
    },
    {
      actionName: "ensureGoogleHeadshot",
      context: { userId },
      errorMessage: "Failed to save Google headshot"
    }
  );
}
