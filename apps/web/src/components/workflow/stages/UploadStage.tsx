"use client";

import { useState, useEffect } from "react";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { DragDropZone } from "../DragDropZone";
import { ImageUploadGrid } from "../../shared/ImageUploadGrid";
import { Button } from "../../ui/button";
import { createProject } from "../../../server/actions/db/projects";
import type { ProcessedImage } from "../../../types/images";
import { DBProject } from "@shared/types/models";
import {
  uploadFilesBatch,
  deleteFile
} from "@web/src/server/actions/api/storage";
import {
  saveImages,
  deleteImage as deleteImageRecord
} from "@web/src/server/actions/db/images";

interface UploadStageProps {
  images: ProcessedImage[];
  setImages: React.Dispatch<React.SetStateAction<ProcessedImage[]>>;
  currentProject: DBProject | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<DBProject | null>>;
  onImageClick: (imageId: string) => void;
  onContinue: () => void;
}

export function UploadStage({
  images,
  setImages,
  currentProject,
  setCurrentProject,
  onImageClick,
  onContinue
}: UploadStageProps) {
  const user = useUser({ or: "redirect" });
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Check if we can continue from upload
  const isUploadInitiated = images.length > 0;
  const allUploadedOrError =
    isUploadInitiated &&
    images.every(
      (img) =>
        img.status === "uploaded" ||
        img.status === "analyzed" ||
        img.status === "error"
    );

  // Cleanup object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      // Cleanup object URLs to prevent memory leaks
      images.forEach((img) => {
        if (img.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [images]);

  /**
   * Generate a preview URL using createObjectURL
   * More efficient than FileReader - creates reference instead of data URL
   */
  const generatePreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  /**
   * Create a single ProcessedImage from a File
   */
  const createImageData = (file: File): ProcessedImage => {
    const id = nanoid();
    const previewUrl = generatePreviewUrl(file);

    return {
      id,
      file,
      filename: file.name,
      previewUrl,
      status: "pending"
    };
  };

  /**
   * Create an array of ProcessedImage objects from File array
   */
  const createImageDataArray = (files: File[]): ProcessedImage[] => {
    return files.map((file) => createImageData(file));
  };

  // ============================================================================
  // Upload Handlers
  // ============================================================================

  const createNewProject = async () => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to create a project."
      });
      return null;
    }

    try {
      const newProject = await createProject();
      setCurrentProject(newProject);
      return newProject;
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred"
      });
      return null;
    }
  };

  const persistImageRecord = async (
    projectId: string,
    image: ProcessedImage,
    url: string
  ) => {
    try {
      await saveImages(projectId, [
        {
          id: image.id,
          projectId,
          filename: image.filename || image.file.name,
          url
        }
      ]);
    } catch (error) {
      console.error("Failed to save image metadata:", error);
      toast.error("Failed to save image", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };

  const handleUploadImages = async (imageDataArray: ProcessedImage[]) => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to upload images."
      });
      return;
    }

    let project = currentProject;

    if (!project) {
      project = await createNewProject();
    }

    if (!project) {
      console.error("No project available");
      toast.error("Upload failed", {
        description: "Unable to create project. Please try again."
      });
      return;
    }

    setIsUploading(true);

    try {
      for (let i = 0; i < imageDataArray.length; i++) {
        const imageData = imageDataArray[i];

        setImages((prev) =>
          prev.map((img) =>
            img.id === imageData.id
              ? { ...img, status: "uploading" as const }
              : img
          )
        );

        try {
          const uploadResult = await uploadFilesBatch(
            [imageData.file],
            "images",
            user.id,
            project.id
          );
          const [result] = uploadResult.results;

          if (result?.success && result.url) {
            await persistImageRecord(project.id, imageData, result.url);

            setImages((prev) =>
              prev.map((img) =>
                img.id === imageData.id
                  ? {
                      ...img,
                      status: "uploaded" as const,
                      url: result.url || undefined,
                      filename: img.filename || imageData.file.name
                    }
                  : img
              )
            );
          } else {
            const errorMessage =
              result?.error ?? uploadResult.error ?? "Upload failed";

            // Show error toast instead of storing in image state
            toast.error("Image upload failed", {
              description: `${imageData.file.name}: ${errorMessage}`
            });

            setImages((prev) =>
              prev.map((img) =>
                img.id === imageData.id
                  ? {
                      ...img,
                      status: "error" as const
                    }
                  : img
              )
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Upload failed";

          // Show error toast instead of storing in image state
          toast.error("Image upload failed", {
            description: `${imageData.file.name}: ${errorMessage}`
          });

          setImages((prev) =>
            prev.map((img) =>
              img.id === imageData.id
                ? {
                    ...img,
                    status: "error" as const
                  }
                : img
            )
          );
        }
      }
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to upload images and create projects."
      });
      return;
    }

    setIsLoadingPreviews(true);
    try {
      // Create image data synchronously (now uses URL.createObjectURL)
      const imageDataArray = createImageDataArray(files);

      setImages((prev) => {
        const existingFilenames = new Set(prev.map((img) => img.file.name));
        const newImages = imageDataArray.filter(
          (img) => !existingFilenames.has(img.file.name)
        );

        const duplicateCount = imageDataArray.length - newImages.length;
        if (duplicateCount > 0) {
          toast.info(`Skipped ${duplicateCount} duplicate image(s)`);
        }

        return [...prev, ...newImages];
      });

      const existingFilenames = new Set(images.map((img) => img.file.name));
      const newImagesToUpload = imageDataArray.filter(
        (img) => !existingFilenames.has(img.file.name)
      );

      if (newImagesToUpload.length > 0) {
        await handleUploadImages(newImagesToUpload);
      }
    } catch (error) {
      console.error("Error generating previews:", error);
      toast.error("Failed to load images", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  const handleRetryUpload = async (imageId: string) => {
    const imageToRetry = images.find((img) => img.id === imageId);
    if (!imageToRetry || !currentProject || !user) return;

    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId
          ? { ...img, status: "uploading" as const, error: undefined }
          : img
      )
    );

    try {
      const uploadResult = await uploadFilesBatch(
        [imageToRetry.file],
        "images",
        user.id,
        currentProject.id
      );
      const [result] = uploadResult.results;

      if (result?.success && result.url) {
        await persistImageRecord(currentProject.id, imageToRetry, result.url);

        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? {
                  ...img,
                  status: "uploaded" as const,
                  url: result?.url || undefined,
                  filename: img.filename || imageToRetry.file.name
                }
              : img
          )
        );
      } else {
        const errorMessage =
          result?.error ?? uploadResult.error ?? "Upload failed";

        // Show error toast instead of storing in image state
        toast.error("Image upload failed", {
          description: `${imageToRetry.file.name}: ${errorMessage}`
        });

        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId ? { ...img, status: "error" as const } : img
          )
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      // Show error toast instead of storing in image state
      toast.error("Image upload failed", {
        description: `${imageToRetry.file.name}: ${errorMessage}`
      });

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                status: "error" as const
              }
            : img
        )
      );
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    const imageToRemove = images.find((img) => img.id === imageId);
    setImages((prev) => prev.filter((img) => img.id !== imageId));

    if (!imageToRemove) {
      return;
    }

    const imageUrl = imageToRemove.url || imageToRemove.uploadUrl;

    if (imageUrl) {
      try {
        await deleteFile(imageUrl);
      } catch (error) {
        console.error("Failed to delete image from storage:", error);
        toast.error("Failed to delete image from storage", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred"
        });
      }
    }

    try {
      await deleteImageRecord(imageId);
    } catch (error) {
      console.error("Failed to delete image from database:", error);
      toast.error("Failed to delete image record", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };

  return (
    <div className="flex flex-col">
      <div className="p-6">
        <DragDropZone
          onFilesSelected={handleFilesSelected}
          maxFiles={50}
          maxFileSize={10 * 1024 * 1024} // 10MB
          acceptedFormats={[".jpg", ".jpeg", ".png", ".webp"]}
          isDisabled={isLoadingPreviews || isUploading}
          isUploadInitiated={isUploadInitiated}
        />

        <ImageUploadGrid
          images={images}
          onRemove={handleRemoveImage}
          onRetry={handleRetryUpload}
          onImageClick={onImageClick}
        />
      </div>

      {/* Continue Button - Sticky at bottom */}
      {isUploadInitiated && (
        <div
          className={`sticky bottom-0 left-0 right-0 z-20 pt-4 ${
            images.length <= 5 ? "mt-[12px]" : "pb-4"
          } px-6 bg-white border-t`}
        >
          <Button
            onClick={onContinue}
            disabled={!allUploadedOrError}
            className="w-full"
            size="lg"
          >
            {!allUploadedOrError
              ? "Waiting for uploads to complete..."
              : `Continue with ${
                  images.filter(
                    (img) =>
                      img.status === "uploaded" || img.status === "analyzed"
                  ).length
                } image(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}
