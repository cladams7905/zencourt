import { and, db, eq, inArray, listingImages } from "@db/client";
import type { SerializableImageData } from "@web/src/types/images";
import { getListingById } from "@web/src/server/actions/db/listings";
import { assignPrimaryListingImageForCategory } from "@web/src/server/actions/db/listingImages";

export async function assertListingExists(
  userId: string,
  listingId: string
): Promise<void> {
  const listing = await getListingById(userId, listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }
}

export async function loadListingImages(
  listingId: string,
  imageIds?: string[]
) {
  if (imageIds && imageIds.length > 0) {
    return db
      .select()
      .from(listingImages)
      .where(
        and(
          eq(listingImages.listingId, listingId),
          inArray(listingImages.id, imageIds)
        )
      );
  }

  return db.select().from(listingImages).where(eq(listingImages.listingId, listingId));
}

export function toSerializableImageData(
  image: typeof listingImages.$inferSelect
): SerializableImageData {
  return {
    id: image.id,
    listingId: image.listingId,
    url: image.url,
    filename: image.filename,
    category: image.category ?? null,
    confidence: image.confidence ?? null,
    primaryScore: image.primaryScore ?? null,
    status: "uploaded",
    isPrimary: image.isPrimary ?? false,
    metadata: image.metadata ?? null,
    error: undefined,
    uploadUrl: undefined
  };
}

export async function persistListingImageAnalysis(
  listingId: string,
  image: SerializableImageData
): Promise<void> {
  await db
    .update(listingImages)
    .set({
      category: image.category ?? null,
      confidence: image.confidence ?? null,
      primaryScore: image.primaryScore ?? null,
      metadata: image.metadata ?? undefined
    })
    .where(and(eq(listingImages.id, image.id), eq(listingImages.listingId, listingId)));
}

export async function assignPrimaryImagesByCategory(
  userId: string,
  listingId: string,
  categories: string[]
): Promise<void> {
  const uniqueCategories = Array.from(
    new Set(categories.filter((category) => category.trim() !== ""))
  );

  if (uniqueCategories.length === 0) {
    return;
  }

  await Promise.all(
    uniqueCategories.map((category) =>
      assignPrimaryListingImageForCategory(userId, listingId, category)
    )
  );
}
