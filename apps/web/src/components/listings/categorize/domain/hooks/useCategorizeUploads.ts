"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ListingImageItem } from "@web/src/components/listings/categorize/shared";
import {
  createListingImageRecords,
  deleteListingImageUploads,
  getListingImageUploadUrls
} from "@web/src/server/actions/db/listings";

type RunDraftSave = <T>(fn: () => Promise<T>) => Promise<T>;

type UseCategorizeUploadsParams = {
  userId: string;
  listingId: string;
  runDraftSave: RunDraftSave;
  setImages: React.Dispatch<React.SetStateAction<ListingImageItem[]>>;
};

export function useCategorizeUploads({
  userId,
  listingId,
  runDraftSave,
  setImages
}: UseCategorizeUploadsParams) {
  const router = useRouter();

  const getUploadUrls = React.useCallback(
    (requests: Parameters<typeof getListingImageUploadUrls>[2]) =>
      getListingImageUploadUrls(userId, listingId, requests),
    [listingId, userId]
  );

  const onCreateRecords = React.useCallback(
    async (records: Parameters<typeof createListingImageRecords>[2]) => {
      const batchStartedAt = Date.now();
      try {
        const created = await runDraftSave(() =>
          createListingImageRecords(userId, listingId, records)
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
            deleteListingImageUploads(
              userId,
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
    [listingId, router, runDraftSave, setImages, userId]
  );

  const onUploadsComplete = React.useCallback(
    ({ count, batchStartedAt }: { count: number; batchStartedAt: number }) => {
      if (!listingId?.trim()) {
        return;
      }
      const batchParam =
        count > 0
          ? `?batch=${count}&batchStartedAt=${batchStartedAt}`
          : `?batchStartedAt=${batchStartedAt}`;
      router.push(`/listings/${listingId}/categorize/processing${batchParam}`);
    },
    [listingId, router]
  );

  return {
    getUploadUrls,
    onCreateRecords,
    onUploadsComplete
  };
}
