import storageService from "@web/src/server/services/storage";

export type RenderListingTemplateBatchBody = {
  subcategory?: unknown;
  captionItems?: unknown;
  templateCount?: number;
};

export type RenderListingTemplateBatchStreamBody = {
  subcategory?: unknown;
  captionItems?: unknown;
  templateCount?: number;
  templateId?: string;
};

export function resolveListingImagesToPublicUrls<T extends { url: string }>(
  listingImages: T[]
): T[] {
  return listingImages.map((img) => {
    const publicUrl = storageService.getPublicUrlForStorageUrl(img.url);
    return {
      ...img,
      url: publicUrl ?? img.url
    };
  });
}
