import * as React from "react";
import { toast } from "sonner";
import {
  compressImageToTarget,
  createVideoThumbnailBlob
} from "@web/src/components/uploads/domain/services";
import type {
  PendingUpload,
  UploadDescriptor,
  UploadDialogProps,
  UploadRequest
} from "@web/src/components/uploads/shared";

type UseUploadDialogStateArgs<TRecord> = Pick<
  UploadDialogProps<TRecord>,
  | "open"
  | "onOpenChange"
  | "selectedLabel"
  | "errorMessage"
  | "fileValidator"
  | "getUploadUrls"
  | "buildRecordInput"
  | "onCreateRecords"
  | "onSuccess"
  | "onUploadsComplete"
  | "thumbnailFailureMessage"
  | "maxFiles"
  | "maxImageBytes"
  | "compressOversizeImages"
>;

type UploadItemUpdate = Partial<{
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
}>;

type UploadBuildResult<TRecord> = {
  record: TRecord;
  thumbnailFailed: boolean;
};

const getFileDedupKey = (file: File) =>
  `${file.name}-${file.size}-${file.type}`;

const generateUploadId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildUploadRequest = (item: PendingUpload): UploadRequest => ({
  id: item.id,
  fileName: item.file.name,
  fileType: item.file.type,
  fileSize: item.file.size
});

const toFailedPendingUpload = (item: PendingUpload): PendingUpload => ({
  ...item,
  previewUrl: URL.createObjectURL(item.file),
  progress: 0,
  status: "error"
});

export const useUploadDialogState = <TRecord>({
  open,
  onOpenChange,
  selectedLabel = "file",
  errorMessage = "Failed to upload files. Please try again.",
  fileValidator,
  getUploadUrls,
  buildRecordInput,
  onCreateRecords,
  onSuccess,
  onUploadsComplete,
  thumbnailFailureMessage,
  maxFiles,
  maxImageBytes,
  compressOversizeImages
}: UseUploadDialogStateArgs<TRecord>) => {
  const [pendingFiles, setPendingFiles] = React.useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDrivePickerActive, setIsDrivePickerActive] = React.useState(false);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [isDriveLoading, setIsDriveLoading] = React.useState(false);
  const [driveLoadingCount, setDriveLoadingCount] = React.useState(0);

  const revokePendingPreviews = React.useCallback((items: PendingUpload[]) => {
    items.forEach((item) => {
      if (item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }, []);

  const resetDialogState = React.useCallback(() => {
    setPendingFiles((prev) => {
      revokePendingPreviews(prev);
      return [];
    });
    setIsDragging(false);
  }, [revokePendingPreviews]);

  React.useEffect(() => {
    if (!open) {
      resetDialogState();
    }
  }, [open, resetDialogState]);

  React.useEffect(() => {
    if (!isDrivePickerActive) {
      return;
    }
    const saved = document.body.style.pointerEvents;
    document.body.style.pointerEvents = "";
    return () => {
      document.body.style.pointerEvents = saved;
    };
  }, [isDrivePickerActive]);

  const compressImageIfNeeded = React.useCallback(
    async (file: File) => {
      if (!maxImageBytes) {
        return file;
      }

      const compressed = await compressImageToTarget(file, maxImageBytes);
      if (compressed) {
        return compressed;
      }

      toast.error(`Unable to compress "${file.name}".`);
      return file;
    },
    [maxImageBytes]
  );

  const toPendingUpload = React.useCallback(async (file: File): Promise<PendingUpload> => {
    let previewUrl = URL.createObjectURL(file);
    let previewType: "image" | "video" = file.type.startsWith("video/")
      ? "video"
      : "image";

    if (file.type.startsWith("video/")) {
      const previewBlob = await createVideoThumbnailBlob(file);
      if (previewBlob) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(previewBlob);
        previewType = "image";
      }
    }

    return {
      id: generateUploadId(),
      file,
      previewUrl,
      previewType,
      progress: 0,
      status: "ready"
    };
  }, []);

  const mergePendingFiles = React.useCallback(
    (
      prev: PendingUpload[],
      nextItems: PendingUpload[],
      acceptedCount: number
    ): PendingUpload[] => {
      const remainingSlots =
        typeof maxFiles === "number" ? Math.max(0, maxFiles - prev.length) : Infinity;

      if (remainingSlots <= 0) {
        toast.error(`You can only upload up to ${maxFiles} ${selectedLabel}s.`);
        return prev;
      }

      const existing = new Set(prev.map((item) => getFileDedupKey(item.file)));
      const next = [...prev];

      nextItems.slice(0, remainingSlots).forEach((item) => {
        const key = getFileDedupKey(item.file);
        if (!existing.has(key)) {
          next.push(item);
          existing.add(key);
          return;
        }

        if (item.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      if (acceptedCount > remainingSlots) {
        toast.error(`Only ${remainingSlots} more ${selectedLabel}(s) allowed.`);
      }

      return next;
    },
    [maxFiles, selectedLabel]
  );

  const addFiles = React.useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      setIsCompressing(true);
      const accepted: File[] = [];

      try {
        for (const originalFile of files) {
          let preparedFile = originalFile;
          if (
            compressOversizeImages &&
            maxImageBytes &&
            originalFile.type.startsWith("image/") &&
            originalFile.size > maxImageBytes
          ) {
            preparedFile = await compressImageIfNeeded(originalFile);
          }
          const result = fileValidator(preparedFile);

          if (!result.accepted) {
            if (result.error) {
              toast.error(result.error);
            }
            continue;
          }

          accepted.push(preparedFile);
        }
      } finally {
        setIsCompressing(false);
      }

      if (accepted.length === 0) {
        return;
      }

      const nextItems = await Promise.all(accepted.map((file) => toPendingUpload(file)));
      setPendingFiles((prev) => mergePendingFiles(prev, nextItems, accepted.length));
    },
    [
      compressImageIfNeeded,
      compressOversizeImages,
      fileValidator,
      maxImageBytes,
      mergePendingFiles,
      toPendingUpload
    ]
  );

  const updatePendingFile = React.useCallback((id: string, updates: UploadItemUpdate) => {
    setPendingFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const uploadFileWithProgress = React.useCallback(
    async (uploadUrl: string, file: File, id: string): Promise<boolean> => {
      updatePendingFile(id, { status: "uploading", progress: 0 });

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.timeout = 60000;

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }
          const percent = Math.round((event.loaded / event.total) * 100);
          updatePendingFile(id, { progress: percent });
        };

        const failUpload = () => {
          updatePendingFile(id, { status: "error" });
          resolve(false);
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            updatePendingFile(id, { progress: 100, status: "done" });
            resolve(true);
            return;
          }
          failUpload();
        };
        xhr.ontimeout = failUpload;
        xhr.onerror = failUpload;
        xhr.send(file);
      });
    },
    [updatePendingFile]
  );

  const uploadThumbnailIfAvailable = React.useCallback(
    async (file: File, upload: { thumbnailUploadUrl?: string; thumbnailKey?: string }) => {
      if (!upload.thumbnailUploadUrl || !upload.thumbnailKey) {
        return {
          thumbnailKey: undefined,
          thumbnailFailed: false
        };
      }

      const thumbnailBlob = await createVideoThumbnailBlob(file);
      if (!thumbnailBlob) {
        return {
          thumbnailKey: undefined,
          thumbnailFailed: true
        };
      }

      const thumbnailResponse = await fetch(upload.thumbnailUploadUrl, {
        method: "PUT",
        body: thumbnailBlob,
        headers: {
          "Content-Type": "image/jpeg"
        }
      });

      if (thumbnailResponse.ok) {
        return {
          thumbnailKey: upload.thumbnailKey,
          thumbnailFailed: false
        };
      }

      return {
        thumbnailKey: undefined,
        thumbnailFailed: true
      };
    },
    []
  );

  const buildUploadRecord = React.useCallback(
    async (
      upload: UploadDescriptor,
      fileMap: Map<string, File>,
      failedIds: Set<string>
    ): Promise<UploadBuildResult<TRecord> | null> => {
      const file = fileMap.get(upload.id);
      if (!file) {
        failedIds.add(upload.id);
        updatePendingFile(upload.id, { status: "error" });
        return null;
      }

      const uploadSucceeded = await uploadFileWithProgress(upload.uploadUrl, file, upload.id);
      if (!uploadSucceeded) {
        failedIds.add(upload.id);
        return null;
      }

      const { thumbnailKey, thumbnailFailed } = await uploadThumbnailIfAvailable(
        file,
        upload
      );

      try {
        const record = await buildRecordInput({
          upload,
          file,
          thumbnailKey,
          thumbnailFailed
        });

        return {
          record,
          thumbnailFailed
        };
      } catch (error) {
        failedIds.add(upload.id);
        updatePendingFile(upload.id, { status: "error" });
        toast.error((error as Error).message || "Failed to prepare upload record.");
        return null;
      }
    },
    [buildRecordInput, updatePendingFile, uploadFileWithProgress, uploadThumbnailIfAvailable]
  );

  const handleUpload = React.useCallback(async () => {
    const targets = pendingFiles.filter((item) => item.status !== "done");
    if (targets.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);

    try {
      const fileMap = new Map<string, File>();
      const uploadRequests = targets.map((item) => {
        fileMap.set(item.id, item.file);
        return buildUploadRequest(item);
      });

      const { uploads, failed } = await getUploadUrls(uploadRequests);
      const failedIds = new Set(failed.map((item) => item.id));

      const requestedIds = new Set(uploadRequests.map((item) => item.id));
      const returnedIds = new Set(uploads.map((upload) => upload.id));
      const missingIds = Array.from(requestedIds).filter(
        (id) => !returnedIds.has(id) && !failedIds.has(id)
      );
      missingIds.forEach((id) => failedIds.add(id));

      if (failed.length > 0) {
        failed.forEach((item) => updatePendingFile(item.id, { status: "error" }));
        toast.error(`${failed.length} file(s) failed validation.`);
      }

      if (missingIds.length > 0) {
        missingIds.forEach((id) => updatePendingFile(id, { status: "error" }));
        toast.error(`${missingIds.length} file(s) failed to start uploading.`);
      }

      const uploadResults = await Promise.all(
        uploads.map(async (upload) => buildUploadRecord(upload, fileMap, failedIds))
      );

      const successfulUploads = uploadResults.filter(
        (result): result is UploadBuildResult<TRecord> => result !== null
      );

      if (failedIds.size === 0 && successfulUploads.length > 0) {
        onUploadsComplete?.({
          count: successfulUploads.length,
          batchStartedAt: Date.now()
        });
      }

      if (successfulUploads.length > 0) {
        await onCreateRecords(successfulUploads.map((result) => result.record));
      }

      const thumbnailFailures = successfulUploads.filter(
        (result) => result.thumbnailFailed
      ).length;
      if (thumbnailFailures > 0 && thumbnailFailureMessage) {
        toast.error(thumbnailFailureMessage(thumbnailFailures));
      }

      const failedUploads = uploads.filter((upload) => failedIds.has(upload.id));
      if (failedUploads.length > 0) {
        toast.error(`${failedUploads.length} file(s) failed to upload.`);
      }

      const successfulItems = pendingFiles.filter(
        (item) =>
          !failedIds.has(item.id) && targets.some((target) => target.id === item.id)
      );
      revokePendingPreviews(successfulItems);

      if (failedIds.size === 0) {
        resetDialogState();
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      setPendingFiles(targets.filter((item) => failedIds.has(item.id)).map(toFailedPendingUpload));
    } catch (error) {
      toast.error((error as Error).message || errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [
    pendingFiles,
    isUploading,
    getUploadUrls,
    buildUploadRecord,
    onUploadsComplete,
    onCreateRecords,
    thumbnailFailureMessage,
    revokePendingPreviews,
    resetDialogState,
    onOpenChange,
    onSuccess,
    errorMessage,
    updatePendingFile
  ]);

  const hasFailedUploads = pendingFiles.some((item) => item.status === "error");

  const removePendingFile = React.useCallback(
    (id: string) => {
      setPendingFiles((prev) => {
        const target = prev.find((item) => item.id === id);
        if (target) {
          revokePendingPreviews([target]);
        }
        return prev.filter((item) => item.id !== id);
      });
    },
    [revokePendingPreviews]
  );

  const handleRetryFailed = React.useCallback(() => {
    setPendingFiles((prev) =>
      prev.map((item) =>
        item.status === "error" ? { ...item, status: "ready", progress: 0 } : item
      )
    );

    window.setTimeout(() => {
      void handleUpload();
    }, 0);
  }, [handleUpload]);

  return {
    pendingFiles,
    isDragging,
    setIsDragging,
    isUploading,
    isDrivePickerActive,
    setIsDrivePickerActive,
    isCompressing,
    isDriveLoading,
    setIsDriveLoading,
    driveLoadingCount,
    setDriveLoadingCount,
    addFiles,
    resetDialogState,
    handleUpload,
    hasFailedUploads,
    removePendingFile,
    handleRetryFailed,
    revokePendingPreviews
  };
};
