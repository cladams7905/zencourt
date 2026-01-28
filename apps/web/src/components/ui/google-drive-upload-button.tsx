"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "./button";
import { LoadingImage } from "./loading-image";

type GoogleDriveUploadButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "type" | "onClick"
> & {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

function GoogleDriveUploadButton({
  onClick,
  ...props
}: GoogleDriveUploadButtonProps) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (onClick) {
      onClick(event);
      return;
    }
    toast("Google Drive upload is coming soon.");
  };

  return (
    <Button type="button" onClick={handleClick} {...props}>
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
