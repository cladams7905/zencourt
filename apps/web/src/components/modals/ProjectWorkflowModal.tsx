"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../ui/alert-dialog";
import { cn } from "../ui/utils";
import { ProjectNameInput } from "../workflow/ProjectNameInput";
import { UploadStage } from "../workflow/stages/UploadStage";
import { CategorizeStage } from "../workflow/stages/CategorizeStage";
import { PlanStage } from "../workflow/stages/PlanStage";
import { ReviewStage } from "../workflow/stages/ReviewStage";
import { GenerateStage } from "../workflow/stages/GenerateStage";
import { ImagePreviewModal } from "./ImagePreviewModal";
import type { ProcessedImage } from "../../types/images";
import type {
  WorkflowStage,
  GenerationProgress,
  GenerationStep
} from "../../types/workflow";
import { useRef } from "react";
import { updateProject } from "../../server/actions/db/projects";
import { DBProject } from "@shared/types/models";
import {
  CategorizedGroup,
  RoomCategory,
  RoomClassification
} from "@web/src/types/vision";

interface ProjectWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: DBProject) => void;
  existingProject?: DBProject | null;
}

export function ProjectWorkflowModal({
  isOpen,
  onClose,
  onProjectCreated,
  existingProject
}: ProjectWorkflowModalProps) {
  // Workflow state
  const [currentStage, setCurrentStage] = useState<WorkflowStage>("upload");
  const [projectName, setProjectName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Project and image state
  const [currentProject, setCurrentProject] = useState<DBProject | null>(null);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [categorizedGroups, setCategorizedGroups] = useState<
    CategorizedGroup[]
  >([]);

  // Video settings state
  const [videoSettings, setVideoSettings] = useState<{
    orientation: "landscape" | "vertical";
    roomOrder: Array<{ id: string; name: string; imageCount: number }>;
    logoFile: File | null;
    logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    scriptText: string;
    enableSubtitles: boolean;
    subtitleFont: string;
    aiDirections: string;
  } | null>(null);

  // Upload stage state
  const [previewImage, setPreviewImage] = useState<ProcessedImage | null>(null);

  // Categorize stage state
  const [previewImageFromGrid, setPreviewImageFromGrid] =
    useState<ProcessedImage | null>(null);
  const [previewIndexFromGrid, setPreviewIndexFromGrid] = useState<number>(0);

  // Review stage state
  const [isConfirming, setIsConfirming] = useState(false);

  // Generate stage state
  const [generationProgress, setGenerationProgress] =
    useState<GenerationProgress | null>(null);
  const [_generationJobIds, setGenerationJobIds] = useState<string[]>([]);
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  // Internal modal state
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Sync external isOpen prop with internal state
  useEffect(() => {
    setInternalIsOpen(isOpen);
  }, [isOpen]);

  // Load existing project data when modal opens with an existing project
  useEffect(() => {
    async function loadExistingProject() {
      if (!isOpen || !existingProject) return;

      try {
        // Set project info
        setCurrentProject(existingProject);
        setProjectName(existingProject.title || "");

        // Fetch project images
        const { getProjectImages } = await import(
          "../../server/actions/db/images"
        );
        const projectImages = await getProjectImages(existingProject.id);

        // Convert database images to ProcessedImage format
        const processedImages: ProcessedImage[] = projectImages.map((img) => {
          const processed: ProcessedImage = {
            id: img.id,
            file: new File([], img.filename, { type: "image/*" }), // Mock file for existing images
            previewUrl: img.url,
            uploadUrl: img.url,
            status: "uploaded" as const,
            url: img.url,
            filename: img.filename,
            category: img.category,
            confidence: img.confidence,
            features: img.features,
            order: img.order,
            metadata: img.metadata,
            classification: img.category
              ? ({
                  category: img.category as RoomCategory,
                  confidence: img.confidence || 0
                } as RoomClassification)
              : undefined
          };
          return processed;
        });

        setImages(processedImages);

        // If images are already categorized, move to categorize stage
        const categorizedImages = processedImages.filter(
          (img) => img.classification
        );
        if (categorizedImages.length > 0) {
          // Group images by category
          const groups = new Map<string, ProcessedImage[]>();
          categorizedImages.forEach((img) => {
            const category = img.classification!.category;
            if (!groups.has(category)) {
              groups.set(category, []);
            }
            groups.get(category)!.push(img);
          });

          // Convert to CategorizedGroup format
          const categorizedGroups: CategorizedGroup[] = Array.from(
            groups.entries()
          ).map(([category, images], index) => {
            const avgConfidence =
              images.reduce(
                (sum, img) => sum + (img.classification?.confidence || 0),
                0
              ) / images.length;

            return {
              category: category as RoomCategory,
              displayLabel: category,
              baseLabel: category,
              images,
              avgConfidence,
              metadata: {
                id: category as RoomCategory,
                label: category,
                color: "#6b7280",
                icon: "Home",
                allowNumbering: true,
                group: "other" as const,
                order: index
              }
            };
          });

          setCategorizedGroups(categorizedGroups);
          setCurrentStage("categorize");
        }
      } catch (error) {
        console.error("Failed to load existing project:", error);
        toast.error("Failed to load project data");
      }
    }

    loadExistingProject();
  }, [isOpen, existingProject]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Stop polling if active
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
        pollingCleanupRef.current = null;
      }

      // Only reset if we're actually closing (not just switching stages)
      const timeout = setTimeout(() => {
        setCurrentStage("upload");
        setProjectName("");
        setImages([]);
        setCategorizedGroups([]);
        setVideoSettings(null);
        setCurrentProject(null);
        setGenerationProgress(null);
        setGenerationJobIds([]);
      }, 300); // Wait for modal close animation
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
    };
  }, []);

  // Check if there's work in progress
  const hasWorkInProgress = images.length > 0 || currentStage !== "upload";

  // Handle modal close with confirmation
  const handleClose = () => {
    if (hasWorkInProgress && currentStage !== "generate") {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  // ============================================================================
  // Project Name Auto-Save
  // ============================================================================

  // Debounced project name save
  useEffect(() => {
    if (!currentProject || !projectName.trim()) return;

    setIsSavingName(true);
    const timeoutId = setTimeout(async () => {
      try {
        await updateProject(currentProject.id, { title: projectName.trim() });
        console.log("Project name saved:", projectName);
      } catch (error) {
        console.error("Failed to save project name:", error);
        toast.error("Failed to save project name", {
          description: "Your changes may not be saved. Please try again."
        });
      } finally {
        setIsSavingName(false);
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [projectName, currentProject]);

  // ============================================================================
  // Upload Stage Handlers
  // ============================================================================

  const handleImageClick = (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (image) {
      setPreviewImage(image);
      setInternalIsOpen(false);
    }
  };

  const handlePreviewClose = () => {
    setPreviewImage(null);
    setInternalIsOpen(true);
  };

  // ============================================================================
  // Stage Navigation Handlers
  // ============================================================================

  const handleContinueFromUpload = () => {
    setCurrentStage("categorize");
  };

  const handleContinueFromCategorize = () => {
    setCurrentStage("plan");
  };

  const handleBackToCategorize = () => {
    setCurrentStage("categorize");
  };

  // ============================================================================
  // Plan Stage Handlers
  // ============================================================================

  const handleContinueFromPlan = (settings: {
    orientation: "landscape" | "vertical";
    roomOrder: Array<{ id: string; name: string; imageCount: number }>;
    logoFile: File | null;
    logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    scriptText: string;
    enableSubtitles: boolean;
    subtitleFont: string;
    aiDirections: string;
  }) => {
    setVideoSettings(settings);
    setCurrentStage("review");
  };

  const handleConfirmAndGenerate = async () => {
    if (!currentProject) {
      toast.error("No project found", {
        description: "Please try again."
      });
      return;
    }

    setIsConfirming(true);

    try {
      // Validate video settings
      if (!videoSettings) {
        throw new Error("Video settings are required");
      }

      // Call the new video generation API
      const response = await fetch("/api/v1/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          compositionSettings: {
            roomOrder: videoSettings.roomOrder.map((room) => room.id),
            musicUrl: null, // TODO: Add music support
            musicVolume: 0.5,
            transitions: null // TODO: Add transitions support
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to start video generation"
        );
      }

      const result = await response.json();

      // Initialize generation progress with single video generation step
      const steps: GenerationStep[] = [
        {
          id: result.jobId || "job-0",
          label: `Generating ${videoSettings.orientation} video`,
          status: "in-progress" as const
        }
      ];

      setGenerationProgress({
        currentStep: steps[0]?.label || "Starting...",
        totalSteps: steps.length,
        currentStepIndex: 0,
        estimatedTimeRemaining: result.estimatedDuration,
        overallProgress: 0,
        steps
      });

      setGenerationJobIds([result.jobId]);
      setCurrentStage("generate");

      // Start polling for status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `/api/v1/video/status/${result.jobId}?projectId=${currentProject.id}`
          );

          if (!statusResponse.ok) {
            throw new Error("Failed to fetch status");
          }

          const statusData = await statusResponse.json();

          // Update progress
          setGenerationProgress((prev) => {
            if (!prev) return null;

            const updatedSteps = [...prev.steps];
            if (updatedSteps[0]) {
              updatedSteps[0].status =
                statusData.status === "completed"
                  ? "completed"
                  : statusData.status === "failed"
                  ? "failed"
                  : "in-progress";
            }

            return {
              ...prev,
              overallProgress: statusData.progress || 0,
              estimatedTimeRemaining: statusData.estimatedTimeRemaining,
              steps: updatedSteps
            };
          });

          // Handle completion
          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            pollingCleanupRef.current = null;

            toast.success("Generation complete!", {
              description: "Your content has been successfully generated."
            });
          }

          // Handle failure
          if (statusData.status === "failed") {
            clearInterval(pollInterval);
            pollingCleanupRef.current = null;

            toast.error("Generation failed", {
              description: statusData.error?.message || "Please try again."
            });
          }
        } catch (error) {
          console.error("Status polling error:", error);
        }
      }, 2000); // Poll every 2 seconds

      pollingCleanupRef.current = () => clearInterval(pollInterval);
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("Generation failed", {
        description:
          error instanceof Error ? error.message : "Please try again."
      });
      setCurrentStage("review");
    } finally {
      setIsConfirming(false);
    }
  };

  // Determine modal size based on current stage
  const getModalClassName = () => {
    if (currentStage === "generate") {
      return "max-w-5xl h-[92vh]";
    }
    return cn(
      "max-w-4xl h-[92vh]",
      "sm:max-w-4xl sm:h-[92vh]",
      "max-sm:w-screen max-sm:h-screen max-sm:rounded-none"
    );
  };

  // Available categories for plan stage
  const availableCategories = images
    .filter((img) => img.classification?.category)
    .map((img) => img.classification!.category)
    .filter((category, index, self) => self.indexOf(category) === index);

  return (
    <>
      <Dialog open={internalIsOpen} onOpenChange={handleClose}>
        <DialogContent
          className={cn(
            getModalClassName(),
            "flex flex-col p-0 gap-0 overflow-hidden"
          )}
        >
          {/* Modal Header - Fixed */}
          <DialogHeader className="border-b">
            <ProjectNameInput
              value={projectName}
              onChange={setProjectName}
              placeholder="Untitled Project"
              isSaving={isSavingName}
            />
            {/* Header */}
            <div className="sticky top-0 bg-white z-30 px-6 py-4 border-t">
              {currentStage === "upload" && (
                <>
                  <h2 className="text-xl font-semibold">
                    Choose Images to Upload
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click to upload or drag and drop images of your property
                    listing to generate content from.
                  </p>
                </>
              )}
              {currentStage === "categorize" &&
                categorizedGroups.length > 0 && (
                  <>
                    <h2 className="text-xl font-semibold">
                      Review Categorized Images
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {categorizedGroups.length} categories found with{" "}
                      {images.filter((img) => img.classification).length} images
                    </p>
                  </>
                )}
              {currentStage === "plan" && (
                <>
                  <h2 className="text-xl font-semibold">
                    Configure Your Video
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize your property walkthrough video settings
                  </p>
                </>
              )}
              {currentStage === "review" && (
                <>
                  <h2 className="text-xl font-semibold">Review Your Project</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Confirm your images and selected media before generating
                  </p>
                </>
              )}
              {currentStage === "generate" && (
                <>
                  <h2 className="text-xl font-semibold">
                    {generationProgress?.steps?.every(
                      (s) => s.status === "completed"
                    )
                      ? "Generation Complete!"
                      : generationProgress?.steps?.some(
                          (s) => s.status === "failed"
                        )
                      ? "Generation Failed"
                      : "Generating Your Content"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {generationProgress?.steps?.every(
                      (s) => s.status === "completed"
                    )
                      ? "Your content has been successfully generated"
                      : generationProgress?.steps?.some(
                          (s) => s.status === "failed"
                        )
                      ? "Some steps encountered errors"
                      : "Creating video from your images"}
                  </p>
                </>
              )}
            </div>
            <DialogTitle className="hidden">Project Workflow</DialogTitle>
          </DialogHeader>

          {/* Stage Content - Scrollable */}
          <div className="relative flex-1 overflow-auto">
            {/* Upload Stage */}
            {currentStage === "upload" && (
              <UploadStage
                images={images}
                setImages={setImages}
                currentProject={currentProject}
                setCurrentProject={setCurrentProject}
                onImageClick={handleImageClick}
                onContinue={handleContinueFromUpload}
              />
            )}

            {/* Categorize Stage */}
            {currentStage === "categorize" && (
              <CategorizeStage
                images={images}
                setImages={setImages}
                currentProject={currentProject}
                categorizedGroups={categorizedGroups}
                setCategorizedGroups={setCategorizedGroups}
                onImageClick={(image, categoryIndex, imageIndex) => {
                  // Find the global index of the image in all images
                  let globalIndex = 0;
                  for (let i = 0; i < categoryIndex; i++) {
                    globalIndex += categorizedGroups[i].images.length;
                  }
                  globalIndex += imageIndex;

                  setPreviewImageFromGrid(image);
                  setPreviewIndexFromGrid(globalIndex);
                  setInternalIsOpen(false);
                }}
                onContinue={handleContinueFromCategorize}
                onBack={() => setCurrentStage("upload")}
              />
            )}

            {/* Plan Stage */}
            {currentStage === "plan" && (
              <PlanStage
                categorizedGroups={categorizedGroups}
                availableCategories={availableCategories}
                onContinue={handleContinueFromPlan}
                onBack={handleBackToCategorize}
              />
            )}

            {/* Review Stage */}
            {currentStage === "review" && (
              <ReviewStage
                images={images}
                categorizedGroups={categorizedGroups}
                videoSettings={videoSettings || undefined}
                onConfirm={handleConfirmAndGenerate}
                onBack={() => setCurrentStage("plan")}
                isConfirming={isConfirming}
              />
            )}

            {/* Generate Stage */}
            {currentStage === "generate" && generationProgress && (
              <GenerateStage
                progress={generationProgress}
                projectId={currentProject?.id}
                onCancel={() => {
                  // Stop polling
                  if (pollingCleanupRef.current) {
                    pollingCleanupRef.current();
                    pollingCleanupRef.current = null;
                  }
                  // Reset state
                  setCurrentStage("review");
                  setGenerationProgress(null);
                }}
              />
            )}
          </div>
        </DialogContent>

        {/* Image Preview Modal - Upload Step */}
        {previewImage && (
          <ImagePreviewModal
            isOpen={!!previewImage}
            onClose={handlePreviewClose}
            currentImage={{
              id: previewImage.id,
              file: previewImage.file,
              previewUrl: previewImage.previewUrl,
              uploadUrl: previewImage.uploadUrl,
              status: "uploaded"
            }}
            allImages={images.map((img) => ({
              id: img.id,
              file: img.file,
              previewUrl: img.previewUrl,
              uploadUrl: img.uploadUrl,
              status: "uploaded"
            }))}
            currentIndex={images.findIndex((img) => img.id === previewImage.id)}
            onNavigate={(index) => {
              const newImage = images[index];
              if (newImage) {
                setPreviewImage(newImage);
              }
            }}
            categoryInfo={{
              displayLabel: "Upload",
              color: "#6b7280"
            }}
            showMetadata={false}
          />
        )}

        {/* Image Preview Modal - Categorized Grid */}
        {previewImageFromGrid && (
          <ImagePreviewModal
            isOpen={!!previewImageFromGrid}
            onClose={() => {
              setPreviewImageFromGrid(null);
              setInternalIsOpen(true);
            }}
            currentImage={previewImageFromGrid}
            allImages={images}
            currentIndex={previewIndexFromGrid}
            onNavigate={(index) => {
              const newImage = images[index];
              if (newImage) {
                setPreviewImageFromGrid(newImage);
                setPreviewIndexFromGrid(index);
              }
            }}
            categoryInfo={
              previewImageFromGrid.classification
                ? {
                    displayLabel:
                      categorizedGroups.find((g) =>
                        g.images.some(
                          (img) => img.id === previewImageFromGrid.id
                        )
                      )?.displayLabel || "Unknown",
                    color:
                      categorizedGroups.find((g) =>
                        g.images.some(
                          (img) => img.id === previewImageFromGrid.id
                        )
                      )?.metadata.color || "#6b7280"
                  }
                : undefined
            }
            showMetadata={true}
          />
        )}
      </Dialog>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Project Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved work in progress. Are you sure you want to close?
              Your progress will be saved, but you&apos;ll need to start the
              workflow again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Working</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Yes, Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
