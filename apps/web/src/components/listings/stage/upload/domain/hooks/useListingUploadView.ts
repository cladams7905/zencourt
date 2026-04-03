"use client";

import * as React from "react";
import { IMAGE_UPLOAD_LIMIT, MAX_IMAGE_BYTES } from "@shared/utils/mediaUpload";
import { formatBytes } from "@web/src/lib/core/formatting/bytes";
import {
  RECOMMENDED_LISTING_IMAGE_HEIGHT,
  RECOMMENDED_LISTING_IMAGE_WIDTH,
  validateListingUploadRequirements
} from "../utils";
import { useUploadFlow } from "./useUploadFlow";
import { useUploadDialogState } from "@web/src/components/uploads/domain/hooks";
import { updateListingForCurrentUser } from "@web/src/server/actions/listings/commands";
import {
  getStoredPlanProcessingBatch,
  usePlanProcessingFlow
} from "@web/src/components/listings/stage/processing/domain/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type UploadProcessingBatch = {
  listingId: string;
  batchImageIds: string[];
  batchStartedAt: number;
};

/** Captured before upload clears `pendingFiles`, for the processing UI gallery. */
export type ListingUploadProcessingPreview = {
  id: string;
  previewUrl: string;
  name: string;
};

export type UseListingUploadViewParams = {
  listingId?: string;
  initialImages?: Array<{
    id: string;
    url: string;
    filename: string;
  }>;
};

export function useListingUploadView({
  listingId,
  initialImages = []
}: UseListingUploadViewParams = {}) {
  const router = useRouter();
  const initialStoredBatch = React.useMemo(
    () =>
      listingId ? getStoredPlanProcessingBatch(listingId) : null,
    [listingId]
  );
  const [phase, setPhase] = React.useState<"editing" | "uploading" | "analyzing">(
    initialStoredBatch ? "analyzing" : "editing"
  );
  const [processingBatch, setProcessingBatch] =
    React.useState<UploadProcessingBatch | null>(
      initialStoredBatch && listingId
        ? {
            listingId,
            batchImageIds: initialStoredBatch.batchImageIds,
            batchStartedAt: initialStoredBatch.batchStartedAt ?? Date.now()
          }
        : null
    );
  const pendingProcessingBatchRef = React.useRef<UploadProcessingBatch | null>(
    null
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const {
    getUploadUrls,
    buildRecordInput,
    onCreateRecords,
    onUploadsComplete
  } = useUploadFlow({
    listingId,
    onUploadsComplete: (batch) => {
      pendingProcessingBatchRef.current = batch;
    }
  });
  const {
    pendingFiles,
    isDragging,
    setIsDragging,
    setIsDrivePickerActive,
    isCompressing,
    isDriveLoading,
    setIsDriveLoading,
    driveLoadingCount,
    setDriveLoadingCount,
    addFiles,
    handleUpload,
    removePendingFile
  } = useUploadDialogState({
    open: true,
    onOpenChange: () => {},
    selectedLabel: "photo",
    errorMessage: "Failed to upload photos. Please try again.",
    maxFiles: undefined,
    maxImageBytes: MAX_IMAGE_BYTES,
    compressOversizeImages: false,
    fileValidator: (file) =>
      file.type.startsWith("image/")
        ? { accepted: true }
        : {
            accepted: false,
            error: "Only image files are supported."
          },
    getUploadUrls,
    buildRecordInput,
    onCreateRecords,
    onUploadsComplete
  });

  const [isUploadMoreOpen, setIsUploadMoreOpen] = React.useState(false);
  const [processingLocalPreviews, setProcessingLocalPreviews] = React.useState<
    ListingUploadProcessingPreview[]
  >([]);
  const [naturalSizeById, setNaturalSizeById] = React.useState<
    Record<string, { width: number; height: number }>
  >({});
  const existingImageFileNames = React.useMemo(
    () => new Set(initialImages.map((image) => image.filename.toLowerCase())),
    [initialImages]
  );
  const processingState = usePlanProcessingFlow({
    mode: "plan",
    listingId: processingBatch?.listingId ?? listingId ?? "",
    batchImageIds: processingBatch?.batchImageIds,
    batchStartedAt: processingBatch?.batchStartedAt,
    navigate: (url) => {
      setProcessingBatch(null);
      router.replace(url);
    }
  });
  const isInlineProcessing = phase === "uploading" || phase === "analyzing";

  const hasUnsavedClientImages = pendingFiles.length > 0 && phase === "editing";

  const handleCandidateFiles = React.useCallback(
    async (files: File[]) => {
      const accepted: File[] = [];
      let acceptedCount = pendingFiles.length + initialImages.length;
      const existingKeys = new Set(
        pendingFiles.map(
          (item) =>
            `${item.file.name.toLowerCase()}-${item.file.size}-${item.file.lastModified}`
        )
      );
      for (const file of files) {
        const fileKey = `${file.name.toLowerCase()}-${file.size}-${file.lastModified}`;
        if (existingKeys.has(fileKey)) {
          toast.error(`"${file.name}" was rejected: duplicate image.`);
          continue;
        }
        if (existingImageFileNames.has(file.name.toLowerCase())) {
          toast.error(`"${file.name}" was rejected: image already uploaded.`);
          continue;
        }
        const validation = await validateListingUploadRequirements({
          file,
          maxImageBytes: MAX_IMAGE_BYTES
        });
        if (!validation.accepted) {
          toast.error(validation.error);
          continue;
        }
        if (acceptedCount >= IMAGE_UPLOAD_LIMIT) {
          toast.error(
            `"${file.name}" was rejected: no more than ${IMAGE_UPLOAD_LIMIT} images are allowed.`
          );
          continue;
        }
        accepted.push(file);
        acceptedCount += 1;
        existingKeys.add(fileKey);
      }

      if (accepted.length > 0) {
        await addFiles(accepted);
        toast.success(
          `${accepted.length} photo${
            accepted.length === 1 ? "" : "s"
          } uploaded successfully`
        );
      }
    },
    [addFiles, existingImageFileNames, initialImages.length, pendingFiles]
  );

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    void handleCandidateFiles(files);
    event.target.value = "";
  };

  const uploadRequirements = React.useMemo(
    () => [
      `Each image must be ${formatBytes(MAX_IMAGE_BYTES)} or less`,
      `Up to ${IMAGE_UPLOAD_LIMIT} images (we'll organize them for you)`,
      `Recommended ${RECOMMENDED_LISTING_IMAGE_WIDTH}×${RECOMMENDED_LISTING_IMAGE_HEIGHT}px or larger`,
      "Landscape orientation"
    ],
    []
  );

  const canContinue = pendingFiles.length >= 1 || initialImages.length > 0;

  const handleContinue = React.useCallback(async () => {
    if (!canContinue || phase !== "editing") {
      return;
    }
    if (pendingFiles.length === 0) {
      if (listingId?.trim()) {
        try {
          await updateListingForCurrentUser(listingId, {
            listingStage: "plan"
          });
          router.push(`/listings/${listingId}/stage/plan`);
        } catch (error) {
          toast.error(
            (error as Error).message ||
              "Could not save listing progress. Try again."
          );
        }
      }
      return;
    }
    setProcessingLocalPreviews(
      [
        ...pendingFiles.map((item) => ({
          id: item.id,
          previewUrl: item.previewUrl,
          name: item.file.name
        })),
        ...initialImages.map((image) => ({
          id: image.id,
          previewUrl: image.url,
          name: image.filename
        }))
      ]
    );
    pendingProcessingBatchRef.current = null;
    setPhase("uploading");
    try {
      await handleUpload();
      const nextBatch = pendingProcessingBatchRef.current as UploadProcessingBatch | null;
      if (nextBatch === null) {
        setProcessingLocalPreviews([]);
        setPhase("editing");
        return;
      }
      setProcessingBatch(nextBatch);
      try {
        await updateListingForCurrentUser(nextBatch.listingId, {
          listingStage: "plan"
        });
      } catch (error) {
        setProcessingLocalPreviews([]);
        setProcessingBatch(null);
        setPhase("editing");
        toast.error(
          (error as Error).message ||
            "Could not save listing progress. Try again."
        );
        return;
      }
      setPhase("analyzing");
    } catch (error) {
      setProcessingLocalPreviews([]);
      setPhase("editing");
      toast.error(
        (error as Error).message || "Unable to continue to plan."
      );
    }
  }, [canContinue, handleUpload, initialImages, listingId, pendingFiles, phase, router]);

  const handleBack = React.useCallback(() => {
    if (
      hasUnsavedClientImages &&
      !window.confirm("Unsaved uploaded images will be lost. Continue?")
    ) {
      return;
    }
    if (!listingId?.trim()) {
      router.push("/listings/create");
      return;
    }
    router.push(`/listings/create?listingId=${encodeURIComponent(listingId)}`);
  }, [hasUnsavedClientImages, listingId, router]);

  React.useEffect(() => {
    if (!hasUnsavedClientImages) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor || anchor.getAttribute("data-ignore-unsaved") === "true") {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }
      const nextUrl = new URL(href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (
        nextUrl.origin !== currentUrl.origin ||
        nextUrl.href === currentUrl.href
      ) {
        return;
      }

      if (!window.confirm("Unsaved uploaded images will be lost. Continue?")) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedClientImages]);

  return {
    phase,
    initialImages,
    processingState,
    isInlineProcessing,
    processingLocalPreviews,
    pendingFiles,
    isDragging,
    setIsDragging,
    setIsDrivePickerActive,
    isCompressing,
    isDriveLoading,
    driveLoadingCount,
    setIsDriveLoading,
    setDriveLoadingCount,
    fileInputRef,
    handleCandidateFiles,
    handleFileInputChange,
    uploadRequirements,
    canContinue,
    handleContinue,
    handleBack,
    isUploadMoreOpen,
    setIsUploadMoreOpen,
    removePendingFile,
    naturalSizeById,
    setNaturalSizeById
  };
}
