"use client";

import React, { useCallback, useState } from "react";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Progress } from "../../ui/progress";
import { CategorizedImageGrid } from "../../image-grid/CategorizedImageGrid";
import { imageProcessorService } from "../../../server/services/imageProcessor";
import { useCategorization } from "../../../hooks/useCategorization";
import { updateProject } from "../../../server/actions/db/projects";
import { saveImages } from "../../../server/actions/db/images";
import type { ProcessedImage, ProcessingProgress } from "../../../types/images";
import type { CategorizedGroup } from "../../../types/roomCategory";
import type { InsertDBImage } from "@shared/types/models/image";
import type { DBProject } from "@shared/types/models/db.project";

interface CategorizeStageProps {
  images: ProcessedImage[];
  setImages: React.Dispatch<React.SetStateAction<ProcessedImage[]>>;
  currentProject: DBProject | null;
  categorizedGroups: CategorizedGroup[];
  setCategorizedGroups: React.Dispatch<
    React.SetStateAction<CategorizedGroup[]>
  >;
  onImageClick: (
    image: ProcessedImage,
    categoryIndex: number,
    imageIndex: number
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function CategorizeStage({
  images,
  setImages,
  currentProject,
  categorizedGroups,
  setCategorizedGroups,
  onImageClick,
  onContinue,
  onBack
}: CategorizeStageProps) {
  const user = useUser();
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [processingProgress, setProcessingProgress] =
    useState<ProcessingProgress | null>(null);
  const { categorizeImages } = useCategorization();
  // Use state instead of ref so it persists across modal close/reopen
  const [hasInitiatedProcessing, setHasInitiatedProcessing] = useState(false);

  // Check if we need to process images on mount
  const alreadyAnalyzed = images.filter(
    (img) =>
      img.category && (img.status === "uploaded" || img.status === "analyzed")
  );
  const needsAnalysis = images.filter(
    (img) =>
      !img.category &&
      (img.status === "uploaded" || img.status === "analyzed") &&
      !img.error
  );

  // If images need analysis and we haven't started processing, start automatically
  // Check if the number of analyzed images doesn't match total images needing it
  const totalImagesThatShouldBeAnalyzed =
    alreadyAnalyzed.length + needsAnalysis.length;
  const allImagesAnalyzed =
    totalImagesThatShouldBeAnalyzed === alreadyAnalyzed.length;

  const handleProcessImages = useCallback(async () => {
    if (!user || !currentProject) {
      toast.error("No project found", {
        description: "Please try uploading images again."
      });
      return;
    }

    // Mark that processing has been initiated
    setHasInitiatedProcessing(true);
    setIsCategorizing(true);

    try {
      await updateProject(currentProject.id, { status: "analyzing" });

      let finalImages: ProcessedImage[];

      if (needsAnalysis.length > 0) {
        // Set initial progress state immediately - start with analyzing since images are already uploaded
        setProcessingProgress({
          phase: "analyzing",
          completed: 0,
          total: needsAnalysis.length,
          overallProgress: 0
        });

        const result = await imageProcessorService.processImages(
          needsAnalysis,
          currentProject.id,
          {
            userId: user.id,
            onProgress: (progress) => {
              // Remap progress to use full 0-100% range for analysis
              // The service uses 50-95% for analysis when images are already uploaded
              let adjustedProgress = progress.overallProgress;
              if (progress.phase === "analyzing") {
                // Map 50-95 to 0-90
                adjustedProgress = ((progress.overallProgress - 50) / 45) * 90;
              } else if (progress.phase === "categorizing") {
                // Map 95 to 90
                adjustedProgress = 90;
              } else if (progress.phase === "complete") {
                // Keep at 95 (we'll finish at 100 after organizing)
                adjustedProgress = 95;
              }

              setProcessingProgress({
                ...progress,
                overallProgress: Math.max(0, adjustedProgress)
              });

              if (progress.currentImage) {
                setImages((prev) =>
                  prev.map((img) =>
                    img.id === progress.currentImage?.id
                      ? progress.currentImage
                      : img
                  )
                );
              }
            }
          }
        );

        finalImages = [...alreadyAnalyzed, ...result.images];
      } else {
        finalImages = alreadyAnalyzed;
      }

      // Show organizing/categorizing phase
      setProcessingProgress({
        phase: "categorizing",
        completed: finalImages.length,
        total: finalImages.length,
        overallProgress: 95
      });

      setImages(finalImages);

      const organized = categorizeImages(finalImages);
      setCategorizedGroups(organized.groups);

      // Save images to database
      try {
        const imagesToSave: InsertDBImage[] = finalImages
          .filter((img) => img.url && img.category)
          .map((img, index) => ({
            id: img.id,
            projectId: currentProject.id,
            filename: img.filename || img.file.name,
            url: img.url!,
            category: img.category!,
            confidence: img.confidence ?? null,
            features: img.features ?? null,
            sceneDescription: img.sceneDescription ?? null,
            order: img.order ?? index,
            metadata: img.metadata ?? null
          }));

        // Debug: Log scene descriptions before saving
        console.log(
          "[CategorizeStage] Images with scene descriptions:",
          imagesToSave.map((img) => ({
            id: img.id,
            hasSceneDesc: !!img.sceneDescription,
            sceneDescLength: img.sceneDescription?.length || 0
          }))
        );

        if (imagesToSave.length > 0) {
          await saveImages(currentProject.id, imagesToSave);
        }
      } catch (error) {
        console.error("Error saving images to database:", error);
        toast.error("Error saving images to database", {
          description: "Please try uploading images again."
        });
        // Don't fail the whole process if DB save fails, just log it
      }

      // Show completion
      setProcessingProgress({
        phase: "complete",
        completed: finalImages.length,
        total: finalImages.length,
        overallProgress: 100
      });

      // Small delay to show 100% completion before transitioning
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error("Error processing images:", error);
      toast.error("Failed to process images", {
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during image processing. Please try again."
      });
    } finally {
      setIsCategorizing(false);
      setProcessingProgress(null);
    }
  }, [
    alreadyAnalyzed,
    currentProject,
    needsAnalysis,
    setCategorizedGroups,
    setImages,
    setHasInitiatedProcessing,
    user
  ]);

  // Auto-start processing when component mounts if needed
  // Only run once using state to prevent multiple calls across remounts
  React.useEffect(() => {
    // Skip if already processing or if state indicates we've already started
    if (isCategorizing || hasInitiatedProcessing) {
      return;
    }

    // Check if we need to process
    if (needsAnalysis.length > 0 && !allImagesAnalyzed) {
      handleProcessImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  const handleRecategorize = (
    imageId: string,
    fromCategoryIndex: number,
    toCategoryIndex: number
  ) => {
    // Find the image in the source category
    const fromGroup = categorizedGroups[fromCategoryIndex];
    const toGroup = categorizedGroups[toCategoryIndex];

    if (!fromGroup || !toGroup) return;

    const imageIndex = fromGroup.images.findIndex((img) => img.id === imageId);
    if (imageIndex === -1) return;

    const movedImage = fromGroup.images[imageIndex];

    // Update the image's category to match new group
    const updatedImage: ProcessedImage = {
      ...movedImage,
      category: toGroup.category
    };

    // Create new groups array with updated images
    const newGroups = [...categorizedGroups];

    // Remove from source category
    newGroups[fromCategoryIndex] = {
      ...fromGroup,
      images: fromGroup.images.filter((img) => img.id !== imageId)
    };

    // Add to destination category
    newGroups[toCategoryIndex] = {
      ...toGroup,
      images: [...toGroup.images, updatedImage],
      avgConfidence:
        [...toGroup.images, updatedImage].reduce(
          (sum, img) => sum + (img.confidence || 0),
          0
        ) /
        (toGroup.images.length + 1)
    };

    // Filter out empty groups
    const filteredGroups = newGroups.filter((group) => group.images.length > 0);

    // Update categorized groups
    setCategorizedGroups(filteredGroups);

    // Also update the images array to reflect the classification change
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? updatedImage : img))
    );

    toast.success("Image recategorized", {
      description: `Moved to ${toGroup.displayLabel}`
    });
  };

  // Show processing UI
  if (isCategorizing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              {processingProgress?.phase === "uploading" &&
                "Uploading images..."}
              {processingProgress?.phase === "analyzing" &&
                "Analyzing with AI..."}
              {processingProgress?.phase === "categorizing" &&
                "Organizing categories..."}
              {processingProgress?.phase === "complete" &&
                "Processing complete!"}
              {!processingProgress && "Starting..."}
            </h3>
            <p className="text-sm text-muted-foreground">
              {processingProgress
                ? `${processingProgress.completed} of ${processingProgress.total} images`
                : "Please wait..."}
            </p>
          </div>

          <div className="space-y-2">
            <Progress
              value={processingProgress?.overallProgress || 0}
              className="h-3"
            />
            <p className="text-xs text-center text-muted-foreground">
              {processingProgress?.overallProgress
                ? `${Math.round(processingProgress.overallProgress)}%`
                : "0%"}
            </p>
          </div>

          {processingProgress?.currentImage && (
            <div className="text-xs text-center text-muted-foreground">
              Processing: {processingProgress.currentImage.file.name}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show categorized grid
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 space-y-4 flex-1">
        <CategorizedImageGrid
          groups={categorizedGroups}
          enablePreview={false}
          enableDragDrop={true}
          showConfidence={true}
          showPreviewMetadata={true}
          onImageClick={onImageClick}
          onRecategorize={handleRecategorize}
        />
      </div>

      {/* Fade overlay and sticky footer */}
      <>
        <div className="sticky bottom-0 left-0 right-0 z-20 pt-4 pb-4 px-6 bg-white border-t flex gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Back to Upload
          </Button>
          <Button onClick={onContinue} className="flex-1" size="lg">
            Continue to Planning
          </Button>
        </div>
      </>
    </div>
  );
}
