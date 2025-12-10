"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, assets } from "@db/client";
import type { DBAsset, InsertDBAsset } from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";
import { ensurePublicUrlSafe } from "../../utils/storageUrls";

type CreateAssetInput = Omit<
  InsertDBAsset,
  "id" | "createdAt" | "updatedAt"
> & { id?: string };

const ASSET_THUMBNAIL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

async function resolveThumbnailUrl(
  url?: string | null
): Promise<string | null> {
  if (!url) {
    return url ?? null;
  }
  const signed = await ensurePublicUrlSafe(url, ASSET_THUMBNAIL_TTL_SECONDS);
  return signed ?? url ?? null;
}

/**
 * Create a new asset for a project
 */
export async function createAsset(
  userId: string,
  asset: CreateAssetInput
): Promise<DBAsset> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to create an asset");
  }
  if (!asset.projectId || asset.projectId.trim() === "") {
    throw new Error("Project ID is required to create an asset");
  }

  return withDbErrorHandling(
    async () => {
      const [newAsset] = await db
        .insert(assets)
        .values({
          ...asset,
          id: asset.id ?? nanoid()
        })
        .returning();

      return {
        ...newAsset,
        thumbnailUrl: await resolveThumbnailUrl(newAsset.thumbnailUrl)
      };
    },
    {
      actionName: "createAsset",
      context: { userId, projectId: asset.projectId },
      errorMessage: "Failed to create asset. Please try again."
    }
  );
}

/**
 * Update an asset by id
 */
export async function updateAsset(
  userId: string,
  assetId: string,
  updates: Partial<Omit<InsertDBAsset, "id" | "projectId" | "createdAt">>
): Promise<DBAsset> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update an asset");
  }
  if (!assetId || assetId.trim() === "") {
    throw new Error("Asset ID is required");
  }

  return withDbErrorHandling(
    async () => {
      const [updatedAsset] = await db
        .update(assets)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(assets.id, assetId))
        .returning();

      if (!updatedAsset) {
        throw new Error("Asset not found");
      }

      return {
        ...updatedAsset,
        thumbnailUrl: await resolveThumbnailUrl(updatedAsset.thumbnailUrl)
      };
    },
    {
      actionName: "updateAsset",
      context: { userId, assetId },
      errorMessage: "Failed to update asset. Please try again."
    }
  );
}

/**
 * Fetch assets for a project
 */
export async function getAssetsByProjectId(
  userId: string,
  projectId: string
): Promise<DBAsset[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch assets");
  }
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required to fetch assets");
  }

  return withDbErrorHandling(
    async () => {
      const assetRows = await db
        .select()
        .from(assets)
        .where(eq(assets.projectId, projectId));
      return Promise.all(
        assetRows.map(async (asset) => ({
          ...asset,
          thumbnailUrl: await resolveThumbnailUrl(asset.thumbnailUrl)
        }))
      );
    },
    {
      actionName: "getAssetsByProjectId",
      context: { userId, projectId },
      errorMessage: "Failed to load assets. Please try again."
    }
  );
}

/**
 * Fetch a single asset by id
 */
export async function getAssetById(
  userId: string,
  assetId: string
): Promise<DBAsset | null> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch asset");
  }
  if (!assetId || assetId.trim() === "") {
    throw new Error("Asset ID is required");
  }

  return withDbErrorHandling(
    async () => {
      const [assetRecord] = await db
        .select()
        .from(assets)
        .where(eq(assets.id, assetId))
        .limit(1);
      if (!assetRecord) {
        return null;
      }
      return {
        ...assetRecord,
        thumbnailUrl: await resolveThumbnailUrl(assetRecord.thumbnailUrl)
      };
    },
    {
      actionName: "getAssetById",
      context: { userId, assetId },
      errorMessage: "Failed to load asset. Please try again."
    }
  );
}

/**
 * Delete an asset by id
 */
export async function deleteAsset(
  userId: string,
  assetId: string
): Promise<void> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to delete an asset");
  }
  if (!assetId || assetId.trim() === "") {
    throw new Error("Asset ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await db.delete(assets).where(eq(assets.id, assetId));
    },
    {
      actionName: "deleteAsset",
      context: { userId, assetId },
      errorMessage: "Failed to delete asset. Please try again."
    }
  );
}
