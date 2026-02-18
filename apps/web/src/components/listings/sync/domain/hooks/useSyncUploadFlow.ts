import * as React from "react";
import {
  createDraftListing,
  createListingImageRecords,
  getListingImageUploadUrls
} from "@web/src/server/actions/db/listings";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listing/sidebarEvents";
import { getImageMetadataFromFile } from "@web/src/lib/domain/media/imageMetadata";
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
  userId: string;
  navigate: (path: string) => void;
};

export const useSyncUploadFlow = ({
  userId,
  navigate
}: UseSyncUploadFlowParams) => {
  const [listingId, setListingIdState] = React.useState<string | null>(null);
  const listingIdRef = React.useRef<string | null>(null);
  const inFlightListingPromiseRef = React.useRef<Promise<string> | null>(null);

  const setListingId = React.useCallback((next: string) => {
    listingIdRef.current = next;
    setListingIdState(next);
  }, []);

  const ensureListingId = React.useCallback(async () => {
    if (listingIdRef.current) {
      return listingIdRef.current;
    }

    if (inFlightListingPromiseRef.current) {
      return inFlightListingPromiseRef.current;
    }

    const pending = (async () => {
      const listing = await createDraftListing(userId);
      if (!listing?.id) {
        throw new Error("Draft listing could not be created.");
      }

      setListingId(listing.id);
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
  }, [setListingId, userId]);

  const getUploadUrls = React.useCallback(
    async (requests: UploadRequest[]) => {
      const activeListingId = await ensureListingId();
      return getListingImageUploadUrls(userId, activeListingId, requests);
    },
    [ensureListingId, userId]
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
      const activeListingId = listingIdRef.current;
      if (!activeListingId) {
        throw new Error("Listing is missing for upload.");
      }
      await createListingImageRecords(userId, activeListingId, records);
    },
    [userId]
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
    listingId,
    ensureListingId,
    getUploadUrls,
    buildRecordInput,
    onCreateRecords,
    onUploadsComplete
  };
};
