"use client";

import { Button } from "../../ui/button";

interface UploadDialogActionsProps {
  hasFailedUploads: boolean;
  onRetryFailed: () => void;
  onCancel: () => void;
  onUpload: () => void;
  isUploading: boolean;
  hasPendingFiles: boolean;
  primaryActionLabel: string;
}

export function UploadDialogActions({
  hasFailedUploads,
  onRetryFailed,
  onCancel,
  onUpload,
  isUploading,
  hasPendingFiles,
  primaryActionLabel
}: UploadDialogActionsProps) {
  return (
    <>
      {hasFailedUploads ? (
        <Button
          type="button"
          variant="outline"
          onClick={onRetryFailed}
          disabled={isUploading}
        >
          Retry failed
        </Button>
      ) : null}
      <Button type="button" variant="ghost" onClick={onCancel} disabled={isUploading}>
        Cancel
      </Button>
      <Button
        type="button"
        onClick={onUpload}
        disabled={isUploading || !hasPendingFiles}
      >
        {isUploading ? "Uploading..." : primaryActionLabel}
      </Button>
    </>
  );
}
