"use client";

import * as React from "react";
import { LoadingImage } from "../../ui/loading-image";
import { Button } from "../../ui/button";
import { useGoogleDrivePicker } from "../domain/hooks";

type GoogleDriveUploadButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "type" | "onClick"
> & {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onFilesSelected?: (files: File[]) => void;
  onPickerOpenChange?: (open: boolean) => void;
  accept?: string;
  maxImageBytes?: number;
  compressImages?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onLoadingCountChange?: (count: number) => void;
};

function GoogleDriveUploadButton({
  onClick,
  onFilesSelected,
  onPickerOpenChange,
  accept,
  maxImageBytes,
  compressImages,
  onLoadingChange,
  onLoadingCountChange,
  ...props
}: GoogleDriveUploadButtonProps) {
  const { isLoading, openFromButton } = useGoogleDrivePicker({
    onFilesSelected,
    onPickerOpenChange,
    accept,
    maxImageBytes,
    compressImages,
    onLoadingChange,
    onLoadingCountChange
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (onClick) {
      onClick(event);
      return;
    }
    openFromButton();
  };

  return (
    <Button type="button" onClick={handleClick} disabled={isLoading} {...props}>
      <LoadingImage
        src="/google-drive-icon.png"
        alt="Google Drive"
        width={24}
        height={24}
      />
      Google Drive
    </Button>
  );
}

export { GoogleDriveUploadButton };
