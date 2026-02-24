import * as React from "react";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listing/sidebarEvents";
import { getImageMetadataFromFile } from "@web/src/lib/domain/media/imageMetadata";
import { createListingForCurrentUser } from "@web/src/server/actions/listings/commands";
import {
  createListingImageRecordsForCurrentUser,
  getListingImageUploadUrlsForCurrentUser
} from "@web/src/server/actions/listings/commands";
import {
  buildListingUploadRecordInput,
  buildProcessingRoute,
  type ListingSyncUploadRecordInput
} from "@web/src/components/listings/sync/domain/listingSyncUtils";

type UploadRequest = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type UseSyncUploadFlowParams = {
  navigate: (path: string) => void;
};

export const useSyncUploadFlow = ({
  navigate
}: UseSyncUploadFlowParams) => {
  const listingIdRef = React.useRef<string | null>(null);
  const inFlightListingPromiseRef = React.useRef<Promise<string> | null>(null);

  const ensureListingId = React.useCallback(async () => {
    if (listingIdRef.current) {
      return listingIdRef.current;
    }

    if (inFlightListingPromiseRef.current) {
      return inFlightListingPromiseRef.current;
    }

    const pending = (async () => {
      const listing = await createListingForCurrentUser();
      if (!listing?.id) {
        throw new Error("Draft listing could not be created.");
      }

      listingIdRef.current = listing.id;
      emitListingSidebarUpdate({
        id: listing.id,
        title: listing.title ?? null,
        listingStage: listing.listingStage ?? "categorize",
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
  }, []);

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
    async (records: ListingSyncUploadRecordInput[]) => {
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
