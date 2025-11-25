"use client";

import type { Dispatch, SetStateAction } from "react";
import { ImagePreviewModal } from "../ImagePreviewModal";
import type { ProcessedImage } from "@web/src/types/images";
import type { CategorizedGroup } from "@web/src/types/vision";

interface UploadPreviewModalProps {
  previewImage: ProcessedImage | null;
  images: ProcessedImage[];
  onClose: () => void;
  setPreviewImage: Dispatch<SetStateAction<ProcessedImage | null>>;
}

export function UploadPreviewModal({
  previewImage,
  images,
  onClose,
  setPreviewImage
}: UploadPreviewModalProps) {
  if (!previewImage) {
    return null;
  }

  return (
    <ImagePreviewModal
      isOpen
      onClose={onClose}
      currentImage={previewImage}
      allImages={images}
      currentIndex={images.findIndex((img) => img.id === previewImage.id)}
      onNavigate={(index) => {
        const nextImage = images[index];
        if (nextImage) {
          setPreviewImage(nextImage);
        }
      }}
      categoryInfo={{
        displayLabel: "Upload",
        color: "#6b7280"
      }}
      showMetadata={false}
    />
  );
}

interface CategorizedPreviewModalProps {
  previewImage: ProcessedImage | null;
  images: ProcessedImage[];
  categorizedGroups: CategorizedGroup[];
  previewIndex: number;
  onClose: () => void;
  setPreviewImage: Dispatch<SetStateAction<ProcessedImage | null>>;
  setPreviewIndex: Dispatch<SetStateAction<number>>;
}

export function CategorizedPreviewModal({
  previewImage,
  images,
  categorizedGroups,
  previewIndex,
  onClose,
  setPreviewImage,
  setPreviewIndex
}: CategorizedPreviewModalProps) {
  if (!previewImage) {
    return null;
  }

  const categoryInfo = previewImage.category
    ? categorizedGroups.find((group) =>
        group.images.some((img) => img.id === previewImage.id)
      )
    : null;

  return (
    <ImagePreviewModal
      isOpen
      onClose={onClose}
      currentImage={previewImage}
      allImages={images}
      currentIndex={previewIndex}
      onNavigate={(index) => {
        const nextImage = images[index];
        if (nextImage) {
          setPreviewImage(nextImage);
          setPreviewIndex(index);
        }
      }}
      categoryInfo={
        categoryInfo
          ? {
              displayLabel: categoryInfo.displayLabel,
              color: categoryInfo.metadata.color
            }
          : undefined
      }
      showMetadata
    />
  );
}
