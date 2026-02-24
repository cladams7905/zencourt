"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ListingImageItem } from "@web/src/components/listings/categorize/shared";
import {
  createListingImageRecordsForCurrentUser,
  deleteListingImageUploadsForCurrentUser,
  getListingImageUploadUrlsForCurrentUser
} from "@web/src/server/actions/listings/commands";

type RunDraftSave = <T>(fn: () => Promise<T>) => Promise<T>;

type UseCategorizeUploadsParams = {
  listingId: string;
  runDraftSave: RunDraftSave;
  setImages: React.Dispatch<React.SetStateAction<ListingImageItem[]>>;
};

export function useCategorizeUploads({
  listingId,
  runDraftSave,
  setImages
}: UseCategorizeUploadsParams) {
  const router = useRouter();

  const getUploadUrls = React.useCallback(
    (requests: Parameters<typeof getListingImageUploadUrlsForCurrentUser>[1]) =>
      getListingImageUploadUrlsForCurrentUser(listingId, requests),
    [listingId]
  );

  const onCreateRecords = React.useCallback(
    async (records: Parameters<typeof createListingImageRecordsForCurrentUser>[1]) => {
      const batchStartedAt = Date.now();
      try {
        const created = await runDraftSave(() =>
          createListingImageRecordsForCurrentUser(listingId, records)
        );
        const createdItems: ListingImageItem[] = created.map((image) => ({
          id: image.id,
          url: image.url,
          filename: image.filename,
          category: image.category ?? null,
          isPrimary: image.isPrimary ?? false,
          primaryScore: image.primaryScore ?? null
        }));
        try {
          router.push(
            `/listings/${listingId}/categorize/processing?batch=${created.length}&batchStartedAt=${batchStartedAt}`
          );
        } catch (error) {
          setImages((prev) => [...createdItems, ...prev]);
          toast.error(
            (error as Error).message || "Failed to navigate to processing."
          );
        }
      } catch (error) {
        try {
          await runDraftSave(() =>
            deleteListingImageUploadsForCurrentUser(
              listingId,
              records.map((record) => record.publicUrl)
            )
          );
        } catch (cleanupError) {
          toast.error(
            (cleanupError as Error).message ||
              "Failed to clean up listing uploads."
          );
        }
        toast.error((error as Error).message || "Failed to save listing images.");
      }
    },
    [listingId, router, runDraftSave, setImages]
  );

  return {
    getUploadUrls,
    onCreateRecords
  };
}
