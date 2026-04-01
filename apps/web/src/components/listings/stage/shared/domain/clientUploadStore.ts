"use client";

export type ClientUploadDraftImage = {
  id: string;
  file: File;
  previewUrl: string;
  filename: string;
};

const listingUploadDraftStore = new Map<string, ClientUploadDraftImage[]>();

export const setListingUploadDraftImages = (
  listingId: string,
  images: ClientUploadDraftImage[]
) => {
  listingUploadDraftStore.set(listingId, images);
};

export const getListingUploadDraftImages = (
  listingId: string
): ClientUploadDraftImage[] => listingUploadDraftStore.get(listingId) ?? [];

export const clearListingUploadDraftImages = (listingId: string) => {
  listingUploadDraftStore.delete(listingId);
};

export const hasListingUploadDraftImages = (listingId: string): boolean =>
  (listingUploadDraftStore.get(listingId)?.length ?? 0) > 0;
