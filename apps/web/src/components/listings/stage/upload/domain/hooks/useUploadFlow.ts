import * as React from "react";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listings/sidebarEvents";
import { getImageMetadataFromFile } from "@web/src/lib/domain/media/imageMetadata";
import { createListingForCurrentUser } from "@web/src/server/actions/listings/commands";
import {
  createListingImageRecordsForCurrentUser,
  getListingImageUploadUrlsForCurrentUser
} from "@web/src/server/actions/listings/image";
import {
  buildListingUploadRecordInput,
  buildProcessingRoute,
  type ListingUploadRecordInput
} from "@web/src/components/listings/stage/upload/domain/utils";

type UploadRequest = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type UseUploadFlowParams = {
  navigate: (path: string) => void;
  listingId?: string;
};

export const useUploadFlow = ({ navigate, listingId }: UseUploadFlowParams) => {
  const listingIdRef = React.useRef<string | null>(listingId ?? null);
  const inFlightListingPromiseRef = React.useRef<Promise<string> | null>(null);

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
      await createListingImageRecordsForCurrentUser(activeListingId, records);
    },
    [ensureListingId]
  );

  const onUploadsComplete = React.useCallback(
    ({ count, batchStartedAt }: { count: number; batchStartedAt: number }) => {
      const activeListingId = listingIdRef.current;
      if (!activeListingId) {
        return;
      }

      navigate(buildProcessingRoute(activeListingId, count, batchStartedAt));
    },
    [navigate]
  );

  return {
    ensureListingId,
    getUploadUrls,
    buildRecordInput,
    onCreateRecords,
    onUploadsComplete
  };
};
