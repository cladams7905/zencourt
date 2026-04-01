"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ListingImageItem } from "@web/src/components/listings/stage/categorize/shared";
import {
  createListingImageRecordsForCurrentUser,
  deleteListingImageUploadsForCurrentUser,
  getListingImageUploadUrlsForCurrentUser
} from "@web/src/server/actions/listings/image";

type RunDraftSave = <T>(fn: () => Promise<T>) => Promise<T>;

type UseCategorizeUploadsParams = {
  listingId: string;
  runDraftSave: RunDraftSave;
  setImages: React.Dispatch<React.SetStateAction<ListingImageItem[]>>;
  onProcessingBatchCreated?: (batch: {
    listingId: string;
    batchImageIds: string[];
    batchStartedAt: number;
    createdImages: ListingImageItem[];
  }) => void;
};

export function useCategorizeUploads({
  listingId,
  runDraftSave,
  setImages,
  onProcessingBatchCreated
}: UseCategorizeUploadsParams) {
  const getUploadUrls = React.useCallback(
    (requests: Parameters<typeof getListingImageUploadUrlsForCurrentUser>[1]) =>
      getListingImageUploadUrlsForCurrentUser(listingId, requests),
    [listingId]
  );

  const onCreateRecords = React.useCallback(
    async (
      records: Parameters<typeof createListingImageRecordsForCurrentUser>[1]
    ) => {
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
          recommendationScore: image.recommendationScore ?? null,
          shotType: image.shotType,
          analysisStatus: image.analysisStatus,
          metadata: image.metadata ?? null
        }));
        setImages((prev) => [...createdItems, ...prev]);
        onProcessingBatchCreated?.({
          listingId,
          batchImageIds: createdItems.map((image) => image.id),
          batchStartedAt,
          createdImages: createdItems
        });
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
        toast.error(
          (error as Error).message || "Failed to save listing images."
        );
      }
    },
    [listingId, onProcessingBatchCreated, runDraftSave, setImages]
  );

  return {
    getUploadUrls,
    onCreateRecords
  };
}
