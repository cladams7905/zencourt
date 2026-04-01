import * as React from "react";
import {
  emitListingSidebarHeartbeat,
  emitListingSidebarUpdate
} from "@web/src/lib/domain/listings/sidebarEvents";
import { getImageMetadataFromFile } from "@web/src/lib/domain/media/imageMetadata";
import { createListingForCurrentUser } from "@web/src/server/actions/listings/commands";
import {
  createListingImageRecordsForCurrentUser,
  getListingImageUploadUrlsForCurrentUser
} from "@web/src/server/actions/listings/image";
import {
  buildListingUploadRecordInput,
  type ListingUploadRecordInput
} from "@web/src/components/listings/stage/upload/domain/utils";

type UploadRequest = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type UseUploadFlowParams = {
  listingId?: string;
  onUploadsComplete?: (summary: {
    listingId: string;
    batchImageIds: string[];
    batchStartedAt: number;
  }) => void;
};

export const useUploadFlow = ({
  listingId,
  onUploadsComplete: onUploadsFinished
}: UseUploadFlowParams) => {
  const listingIdRef = React.useRef<string | null>(listingId ?? null);
  const inFlightListingPromiseRef = React.useRef<Promise<string> | null>(null);
  const lastCreatedImageIdsRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    const existingListingId = listingId?.trim();
    if (!existingListingId) {
      return;
    }
    emitListingSidebarHeartbeat({
      id: existingListingId,
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  const ensureListingId = React.useCallback(async () => {
    if (listingIdRef.current) {
      return listingIdRef.current;
    }

    if (inFlightListingPromiseRef.current) {
      return inFlightListingPromiseRef.current;
    }

    const pending = (async () => {
      if (listingId) {
        listingIdRef.current = listingId;
        return listingId;
      }
      const listing = await createListingForCurrentUser();
      if (!listing?.id) {
        throw new Error("Draft listing could not be created.");
      }

      listingIdRef.current = listing.id;
      emitListingSidebarUpdate({
        id: listing.id,
        title: listing.title ?? null,
        listingStage: listing.listingStage ?? "upload",
        lastOpenedAt: new Date().toISOString()
      });

      return listing.id;
    })();

    inFlightListingPromiseRef.current = pending;

    try {
      return await pending;
    } finally {
      inFlightListingPromiseRef.current = null;
    }
  }, [listingId]);

  const getUploadUrls = React.useCallback(
    async (requests: UploadRequest[]) => {
      const activeListingId = await ensureListingId();
      return getListingImageUploadUrlsForCurrentUser(activeListingId, requests);
    },
    [ensureListingId]
  );

  const buildRecordInput = React.useCallback(
    async ({
      upload,
      file
    }: {
      upload: {
        key: string;
        fileName?: string;
        publicUrl?: string;
      };
      file: File;
      thumbnailKey?: string;
      thumbnailFailed: boolean;
    }) => {
      const metadata = await getImageMetadataFromFile(file);
      return buildListingUploadRecordInput(upload, metadata);
    },
    []
  );

  const onCreateRecords = React.useCallback(
    async (records: ListingUploadRecordInput[]) => {
      const activeListingId = await ensureListingId();
      lastCreatedImageIdsRef.current = [];
      const created = await createListingImageRecordsForCurrentUser(
        activeListingId,
        records
      );
      const createdRows = created ?? [];
      lastCreatedImageIdsRef.current = createdRows.map((image) => image.id);
      return createdRows;
    },
    [ensureListingId]
  );

  const onUploadsComplete = React.useCallback(
    ({ count, batchStartedAt }: { count: number; batchStartedAt: number }) => {
      const activeListingId = listingIdRef.current;
      if (!activeListingId) {
        return;
      }
      if (lastCreatedImageIdsRef.current.length === 0) {
        return;
      }

      onUploadsFinished?.({
        listingId: activeListingId,
        batchImageIds: lastCreatedImageIdsRef.current,
        batchStartedAt
      });
    },
    [onUploadsFinished]
  );

  return {
    ensureListingId,
    getUploadUrls,
    buildRecordInput,
    onCreateRecords,
    onUploadsComplete
  };
};
