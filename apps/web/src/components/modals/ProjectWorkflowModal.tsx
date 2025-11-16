"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@stackframe/stack";
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
import { PlanStage, VideoSettings } from "../workflow/stages/PlanStage";
import { ReviewStage } from "../workflow/stages/ReviewStage";
import { GenerateStage } from "../workflow/stages/GenerateStage";
import { ImagePreviewModal } from "./ImagePreviewModal";
import type { ProcessedImage } from "../../types/images";
import type {
  WorkflowStage,
  GenerationProgress,
  GenerationStep,
  GenerationStepStatus,
  RoomGenerationStatus
} from "../../types/workflow";
import { updateProject } from "../../server/actions/db/projects";
import { DBProject } from "@shared/types/models";
import { CategorizedGroup, RoomCategory } from "@web/src/types/vision";
import type {
  FinalVideoUpdateEvent,
  InitialVideoStatusPayload,
  VideoJobUpdateEvent
} from "../../types/video-events";

interface ProjectWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: DBProject) => void;
  existingProject?: DBProject | null;
}

interface FinalVideoData {
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
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
  const [videoSettings, setVideoSettings] = useState<VideoSettings | null>(
    null
  );

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
  const [roomStatuses, setRoomStatuses] = useState<RoomGenerationStatus[]>([]);
  const [finalVideo, setFinalVideo] = useState<FinalVideoData | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const finalStatusNotifiedRef = useRef<"success" | "error" | null>(null);
  const user = useUser({ or: "redirect" });
  const ROOM_GENERATION_STEP_ID = "room-generation";
  const FINAL_COMPOSE_STEP_ID = "final-compose";

  const stopStatusStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

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
      if (!isOpen || !existingProject || !user) return;

      try {
        // Set project info
        setCurrentProject(existingProject);
        setProjectName(existingProject.title || "");

        // Fetch project images
        const { getProjectImages } = await import(
          "../../server/actions/db/images"
        );
        const projectImages = await getProjectImages(
          user.id,
          existingProject.id
        );

        // Convert database images to ProcessedImage format
        const processedImages: ProcessedImage[] = projectImages.map((img) => {
          const processed: ProcessedImage = {
            id: img.id,
            file: new File([], img.filename, { type: "image/*" }), // Mock file for existing images
            previewUrl: img.url,
            status: "uploaded" as const,
            url: img.url,
            filename: img.filename,
            category: img.category,
            confidence: img.confidence,
            features: img.features,
            sortOrder: img.sortOrder,
            metadata: img.metadata
          };
          return processed;
        });

        setImages(processedImages);

        // If images are already categorized, move to categorize stage
        const categorizedImages = processedImages.filter((img) => img.category);
        if (categorizedImages.length > 0) {
          // Group images by category
          const groups = new Map<string, ProcessedImage[]>();
          categorizedImages.forEach((img) => {
            const category = img.category!;
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
              images.reduce((sum, img) => sum + (img?.confidence || 0), 0) /
              images.length;

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
  }, [isOpen, existingProject, user]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopStatusStream();

      // Only reset if we're actually closing (not just switching stages)
      const timeout = setTimeout(() => {
        setCurrentStage("upload");
        setProjectName("");
        setImages([]);
        setCategorizedGroups([]);
        setVideoSettings(null);
        setCurrentProject(null);
        setGenerationProgress(null);
        setRoomStatuses([]);
        setFinalVideo(null);
      }, 300); // Wait for modal close animation
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopStatusStream();
    };
  }, []);

  // Check if there's work in progress
  const hasWorkInProgress = images.length > 0 || currentStage !== "upload";

  // Handle modal close with confirmation
  const handleClose = () => {
    if (hasWorkInProgress && currentStage !== "generate") {
      setShowCloseConfirm(true);
    } else {
      // Call onProjectCreated callback if project exists before closing
      if (currentProject && onProjectCreated) {
        onProjectCreated(currentProject);
      }
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    // Call onProjectCreated callback if project exists before closing
    if (currentProject && onProjectCreated) {
      onProjectCreated(currentProject);
    }
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
        if (!user) {
          return;
        }
        await updateProject(user.id, currentProject.id, {
          title: projectName.trim()
        });
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
  }, [projectName, currentProject, user]);

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

  const handleContinueFromPlan = (settings: VideoSettings) => {
    setVideoSettings(settings);
    setCurrentStage("review");
  };

  const initializeGenerationProgress = (roomCount: number) => {
    const steps: GenerationStep[] = [
      {
        id: ROOM_GENERATION_STEP_ID,
        label: "Generate Room Videos",
        status: "in-progress" as GenerationStepStatus,
        progress: roomCount > 0 ? 5 : 0
      },
      {
        id: FINAL_COMPOSE_STEP_ID,
        label: "Compose Final Video",
        status: "waiting" as GenerationStepStatus,
        progress: 0
      }
    ];

    setGenerationProgress({
      currentStep: steps[0].label,
      totalSteps: steps.length,
      currentStepIndex: 0,
      estimatedTimeRemaining: Math.max(roomCount * 45, 60),
      overallProgress: 5,
      steps
    });

    finalStatusNotifiedRef.current = null;
  };

  const updateRoomGenerationStep = (completed: number, total: number) => {
    setGenerationProgress((prev) => {
      if (!prev) return prev;
      const progressPercent =
        total === 0
          ? 100
          : Math.min(100, Math.round((completed / total) * 100));

      const steps = prev.steps.map((step) => {
        if (step.id === ROOM_GENERATION_STEP_ID) {
          return {
            ...step,
            status: (progressPercent >= 100
              ? "completed"
              : "in-progress") as GenerationStepStatus,
            progress: progressPercent
          };
        }

        if (
          step.id === FINAL_COMPOSE_STEP_ID &&
          progressPercent >= 100 &&
          step.status === "waiting"
        ) {
          return {
            ...step,
            status: "in-progress" as GenerationStepStatus,
            progress: step.progress ?? 5
          };
        }

        return step;
      });

      const currentStepIndex =
        progressPercent >= 100
          ? steps.findIndex((step) => step.id === FINAL_COMPOSE_STEP_ID) || 0
          : steps.findIndex((step) => step.id === ROOM_GENERATION_STEP_ID) || 0;

      const currentStep = steps[currentStepIndex]?.label || prev.currentStep;

      return {
        ...prev,
        steps,
        currentStep,
        currentStepIndex,
        overallProgress:
          progressPercent >= 100
            ? Math.max(prev.overallProgress, 85)
            : Math.max(prev.overallProgress, Math.round(progressPercent * 0.6))
      };
    });
  };

  const markRoomGenerationFailed = (message: string) => {
    setGenerationProgress((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.map((step) =>
        step.id === ROOM_GENERATION_STEP_ID
          ? {
              ...step,
              status: "failed" as GenerationStepStatus,
              error: message
            }
          : step.id === FINAL_COMPOSE_STEP_ID
          ? {
              ...step,
              status: "waiting" as GenerationStepStatus,
              progress: 0
            }
          : step
      );

      return {
        ...prev,
        steps,
        currentStep: steps[0]?.label || prev.currentStep,
        currentStepIndex: 0
      };
    });
  };

  const markFinalStepInProgress = () => {
    setGenerationProgress((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.map((step) =>
        step.id === FINAL_COMPOSE_STEP_ID
          ? {
              ...step,
              status: "in-progress" as GenerationStepStatus,
              progress: step.progress ?? 10
            }
          : step
      );

      return {
        ...prev,
        steps,
        currentStep: steps[steps.length - 1]?.label || prev.currentStep,
        currentStepIndex: steps.length - 1,
        overallProgress: Math.max(prev.overallProgress, 90)
      };
    });
  };

  const markFinalStepCompleted = () => {
    setGenerationProgress((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.map((step) =>
        step.id === FINAL_COMPOSE_STEP_ID
          ? {
              ...step,
              status: "completed" as GenerationStepStatus,
              progress: 100
            }
          : step
      );

      return {
        ...prev,
        steps,
        currentStep: steps[steps.length - 1]?.label || prev.currentStep,
        currentStepIndex: steps.length - 1,
        overallProgress: 100
      };
    });
  };

  const markFinalStepFailed = (message: string) => {
    setGenerationProgress((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.map((step) =>
        step.id === FINAL_COMPOSE_STEP_ID
          ? {
              ...step,
              status: "failed" as GenerationStepStatus,
              error: message
            }
          : step
      );

      return {
        ...prev,
        steps,
        currentStep: steps[steps.length - 1]?.label || prev.currentStep,
        currentStepIndex: steps.length - 1
      };
    });
  };

  type VideoStatusServerEvent =
    | { type: "initial"; payload: InitialVideoStatusPayload }
    | { type: "job-update"; payload: VideoJobUpdateEvent }
    | { type: "final-update"; payload: FinalVideoUpdateEvent };

  const normalizeRoomStatuses = (
    jobs: VideoJobUpdateEvent[]
  ): RoomGenerationStatus[] => {
    return jobs
      .map((job) => ({
        id: job.jobId,
        roomId: job.roomId || null,
        roomName: job.roomName || null,
        status: job.status,
        videoUrl: job.videoUrl ?? null,
        errorMessage: job.errorMessage ?? null,
        sortOrder: job.sortOrder ?? undefined
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  };

  const syncRoomProgress = (rooms: RoomGenerationStatus[]) => {
    if (rooms.length === 0) {
      return;
    }

    const failedRoom = rooms.find((room) => room.status === "failed");
    if (failedRoom) {
      markRoomGenerationFailed(
        failedRoom.errorMessage || "Room generation failed"
      );
      toast.error("Room generation failed", {
        description:
          failedRoom.errorMessage || "One or more rooms failed to generate."
      });
      return;
    }

    const completedRooms = rooms.filter(
      (room) => room.status === "completed"
    ).length;

    updateRoomGenerationStep(completedRooms, rooms.length);

    if (rooms.length > 0 && completedRooms === rooms.length) {
      markFinalStepInProgress();
    }
  };

  const applyRoomStatusUpdate = (event: VideoJobUpdateEvent) => {
    setRoomStatuses((prev) => {
      const updated = [...prev];
      const nextRoom: RoomGenerationStatus = {
        id: event.jobId,
        roomId: event.roomId || null,
        roomName: event.roomName || null,
        status: event.status,
        videoUrl: event.videoUrl ?? null,
        errorMessage: event.errorMessage ?? null,
        sortOrder: event.sortOrder ?? undefined
      };

      const existingIndex = updated.findIndex(
        (room) => room.id === event.jobId
      );
      if (existingIndex >= 0) {
        updated[existingIndex] = { ...updated[existingIndex], ...nextRoom };
      } else {
        updated.push(nextRoom);
      }

      const ordered = updated.sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );
      syncRoomProgress(ordered);
      return ordered;
    });
  };

  const applyInitialStatusPayload = (payload: InitialVideoStatusPayload) => {
    const normalizedRooms = normalizeRoomStatuses(payload.jobs || []);
    setRoomStatuses(() => {
      syncRoomProgress(normalizedRooms);
      return normalizedRooms;
    });

    if (
      payload.finalVideo?.status === "completed" &&
      payload.finalVideo.finalVideoUrl
    ) {
      setFinalVideo({
        videoUrl: payload.finalVideo.finalVideoUrl,
        thumbnailUrl: payload.finalVideo.thumbnailUrl ?? null,
        duration: payload.finalVideo.duration ?? null
      });
      markFinalStepCompleted();
    } else if (payload.finalVideo?.status === "failed") {
      const message =
        payload.finalVideo.errorMessage || "Final composition failed";
      setFinalVideo(null);
      markFinalStepFailed(message);
      if (finalStatusNotifiedRef.current !== "error") {
        toast.error("Generation failed", {
          description: message
        });
        finalStatusNotifiedRef.current = "error";
      }
    } else {
      setFinalVideo(null);
    }
  };

  const handleFinalVideoEvent = (event: FinalVideoUpdateEvent) => {
    if (event.status === "completed") {
      markFinalStepCompleted();
      if (event.finalVideoUrl) {
        setFinalVideo({
          videoUrl: event.finalVideoUrl,
          thumbnailUrl: event.thumbnailUrl ?? null,
          duration: event.duration ?? null
        });
      }
      if (finalStatusNotifiedRef.current !== "success") {
        toast.success("Generation complete!", {
          description: "Your property video is ready."
        });
        finalStatusNotifiedRef.current = "success";
      }
    } else {
      setFinalVideo(null);
      const message = event.errorMessage || "Final composition failed";
      markFinalStepFailed(message);
      if (finalStatusNotifiedRef.current !== "error") {
        toast.error("Generation failed", {
          description: message
        });
        finalStatusNotifiedRef.current = "error";
      }
    }
  };

  const startStatusStream = (projectId: string | null) => {
    if (!projectId || typeof window === "undefined") {
      return;
    }

    stopStatusStream();

    const source = new EventSource(
      `/api/v1/video/updates?projectId=${projectId}`
    );

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as VideoStatusServerEvent;
        if (data.type === "initial") {
          applyInitialStatusPayload(data.payload);
        } else if (data.type === "job-update") {
          applyRoomStatusUpdate(data.payload);
        } else if (data.type === "final-update") {
          handleFinalVideoEvent(data.payload);
        }
      } catch (error) {
        console.error("Failed to parse video status event:", error);
      }
    };

    source.onerror = (error) => {
      console.error("Video status stream error:", error);
    };

    eventSourceRef.current = source;
  };

  const handleConfirmAndGenerate = async () => {
    if (!currentProject) {
      toast.error("No project found", {
        description: "Please try again."
      });
      return;
    }

    if (!videoSettings) {
      toast.error("Missing video settings", {
        description: "Please configure your video before generating."
      });
      return;
    }

    const totalRooms = videoSettings.roomOrder.length;
    if (totalRooms === 0) {
      toast.error("No rooms selected", {
        description: "Add at least one room to generate video clips."
      });
      return;
    }

    setIsConfirming(true);
    setRoomStatuses([]);
    setFinalVideo(null);

    try {
      stopStatusStream();
      initializeGenerationProgress(totalRooms);
      setCurrentStage("generate");

      const response = await fetch("/api/v1/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          orientation: videoSettings.orientation,
          rooms: videoSettings.roomOrder,
          aiDirections: videoSettings.aiDirections || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to start room generation");
      }

      startStatusStream(currentProject.id);
    } catch (error) {
      stopStatusStream();
      setGenerationProgress(null);
      setCurrentStage("review");
      setRoomStatuses([]);
      setFinalVideo(null);
      console.error("Generation failed:", error);
      toast.error("Generation failed", {
        description:
          error instanceof Error ? error.message : "Please try again."
      });
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
    .filter((img) => img?.category)
    .map((img) => img!.category!)
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
                      {images.filter((img) => img.category).length} images
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
                rooms={roomStatuses}
                finalVideo={finalVideo}
                onCancel={() => {
                  stopStatusStream();
                  // Reset state
                  setCurrentStage("review");
                  setGenerationProgress(null);
                  setRoomStatuses([]);
                  setFinalVideo(null);
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
            currentImage={previewImage}
            allImages={images}
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
              previewImageFromGrid.category
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
