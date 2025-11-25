"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@stackframe/stack";
import { toast } from "sonner";
import { Dialog, DialogContent } from "../ui/dialog";
import { cn } from "../ui/utils";
import type {
  FinalVideoData,
  GenerationProgress,
  GenerationStep,
  GenerationStepStatus,
  RoomGenerationStatus
} from "../../types/workflow";
import type { VideoSettings } from "../workflow/stages/PlanStage";
import { updateProject } from "../../server/actions/db/projects";
import { DBProject, ProjectStage } from "@shared/types/models";
import { CategorizedGroup, RoomCategory } from "@web/src/types/vision";
import type {
  InitialVideoStatusPayload,
  VideoJobUpdateEvent
} from "../../types/video-status";
import { WorkflowHeader } from "./project-workflow/WorkflowHeader";
import { StageContent } from "./project-workflow/StageContent";
import { CloseWorkflowDialog } from "./project-workflow/CloseWorkflowDialog";
import { ProcessedImage } from "@web/src/types/images";

const ROOM_GENERATION_STEP_ID = "room-generation";
const FINAL_COMPOSE_STEP_ID = "final-compose";
const COMPLETED_STEP_LABEL = "Compose Final Video";
const ROOM_STEP_LABEL = "Generate Room Videos";
const POLLING_DELAY_MS = 120_000;
const POLLING_INTERVAL_MS = 5_000;

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
  const [currentStage, setCurrentStage] = useState<ProjectStage>(
    existingProject?.stage ?? "upload"
  );
  const [projectName, setProjectName] = useState(existingProject?.title || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [currentProject, setCurrentProject] = useState<DBProject | null>(
    existingProject ?? null
  );
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [categorizedGroups, setCategorizedGroups] = useState<
    CategorizedGroup[]
  >([]);
  const [videoSettings, setVideoSettings] = useState<VideoSettings | null>(
    null
  );
  const [generationProgress, setGenerationProgress] =
    useState<GenerationProgress | null>(null);
  const [roomStatuses, setRoomStatuses] = useState<RoomGenerationStatus[]>([]);
  const [finalVideo, setFinalVideo] = useState<FinalVideoData | null>(null);
  const [projectStatus, setProjectStatus] =
    useState<InitialVideoStatusPayload | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingActiveRef = useRef(false);
  const generationStartRef = useRef<number | null>(null);
  const [statusCache, setStatusCache] = useState<
    Record<string, InitialVideoStatusPayload>
  >({});
  const [loadedProjectKey, setLoadedProjectKey] = useState<string | null>(null);
  const cachedStatus = existingProject
    ? statusCache[existingProject.id] ?? null
    : null;
  const currentProjectKey = existingProject
    ? `${existingProject.id}:${existingProject.stage}:${
        existingProject.updatedAt ?? ""
      }`
    : null;
  const finalStatusNotifiedRef = useRef<"success" | "error" | null>(null);
  const pendingStageRef = useRef<ProjectStage | null>(null);
  const user = useUser({ or: "redirect" });

  const stopStatusPolling = useCallback(() => {
    pollingActiveRef.current = false;
    if (pollDelayTimeoutRef.current) {
      clearTimeout(pollDelayTimeoutRef.current);
      pollDelayTimeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const persistProjectStage = useCallback(
    async (stage: ProjectStage) => {
      if (!currentProject || !user) {
        return;
      }
      if (currentProject.stage === stage) {
        return;
      }
      try {
        const updatedProject = await updateProject(user.id, currentProject.id, {
          stage
        });
        setCurrentProject(updatedProject);
        onProjectCreated?.(updatedProject);
      } catch (error) {
        console.error("Failed to update project stage:", error);
        toast.error("Failed to update project stage", {
          description:
            error instanceof Error ? error.message : "Please try again."
        });
      }
    },
    [currentProject, onProjectCreated, user]
  );

  const setWorkflowStage = useCallback(
    (stage: ProjectStage, persist: boolean = true) => {
      const stageToPersist: ProjectStage =
        stage === "generate" ? "review" : stage;
      const isEnteringGenerate =
        stage === "generate" && currentStage !== "generate";
      const isLeavingGenerate =
        stage !== "generate" && currentStage === "generate";

      if (isEnteringGenerate) {
        generationStartRef.current = Date.now();
      } else if (isLeavingGenerate) {
        generationStartRef.current = null;
      }

      setCurrentStage(stage);
      setCurrentProject((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          stage: stageToPersist
        };
      });

      if (!persist) {
        pendingStageRef.current = null;
        return;
      }

      if (!currentProject || !user) {
        pendingStageRef.current = stageToPersist;
        return;
      }

      pendingStageRef.current = null;
      void persistProjectStage(stageToPersist);
    },
    [currentProject, currentStage, persistProjectStage, user]
  );

  function normalizeRoomStatuses(
    jobs: VideoJobUpdateEvent[]
  ): RoomGenerationStatus[] {
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
  }


  // Internal modal state
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Sync external isOpen prop with internal state
  useEffect(() => {
    setInternalIsOpen(isOpen);
  }, [isOpen]);


  useEffect(() => {
    if (!isOpen || !currentProject || !user) {
      return;
    }
    if (!pendingStageRef.current) {
      return;
    }
    const stageToPersist = pendingStageRef.current;
    pendingStageRef.current = null;
    void persistProjectStage(stageToPersist);
  }, [currentProject, isOpen, persistProjectStage, user]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopStatusPolling();

      // Only reset if we're actually closing (not just switching stages)
      const timeout = setTimeout(() => {
        setWorkflowStage("upload", false);
        setProjectName("");
        setImages([]);
        setCategorizedGroups([]);
        setVideoSettings(null);
        setCurrentProject(null);
        setGenerationProgress(null);
        setRoomStatuses([]);
        setFinalVideo(null);
        setProjectStatus(null);
        setLoadedProjectKey(null);
      }, 300); // Wait for modal close animation
      return () => clearTimeout(timeout);
    }
  }, [isOpen, setWorkflowStage, stopStatusPolling]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, [stopStatusPolling]);

  // Check if there's work in progress
  const hasWorkInProgress = images.length > 0 || currentStage !== "upload";

  // Handle modal close with confirmation
  const handleClose = () => {
    if (
      hasWorkInProgress &&
      currentStage !== "generate" &&
      currentStage !== "complete"
    ) {
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

  const updateRoomGenerationStep = useCallback(
    (completed: number, total: number) => {
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
            : steps.findIndex((step) => step.id === ROOM_GENERATION_STEP_ID) ||
              0;

        const currentStep = steps[currentStepIndex]?.label || prev.currentStep;

        return {
          ...prev,
          steps,
          currentStep,
          currentStepIndex,
          overallProgress:
            progressPercent >= 100
              ? Math.max(prev.overallProgress, 85)
              : Math.max(
                  prev.overallProgress,
                  Math.round(progressPercent * 0.6)
                )
        };
      });
    },
    []
  );

  const markRoomGenerationFailed = useCallback((message: string) => {
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
  }, []);

  const markFinalStepInProgress = useCallback(() => {
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
  }, []);

  const createCompletedProgress = useCallback((): GenerationProgress => {
    return {
      currentStep: COMPLETED_STEP_LABEL,
      totalSteps: 2,
      currentStepIndex: 1,
      estimatedTimeRemaining: 0,
      overallProgress: 100,
      steps: [
        {
          id: ROOM_GENERATION_STEP_ID,
          label: ROOM_STEP_LABEL,
          status: "completed",
          progress: 100
        },
        {
          id: FINAL_COMPOSE_STEP_ID,
          label: COMPLETED_STEP_LABEL,
          status: "completed",
          progress: 100
        }
      ]
    };
  }, []);

  const markFinalStepCompleted = useCallback(() => {
    setGenerationProgress((prev) => {
      if (!prev) {
        return createCompletedProgress();
      }

      const steps = prev.steps.map((step) =>
        step.id === FINAL_COMPOSE_STEP_ID
          ? {
              ...step,
              status: "completed" as GenerationStepStatus,
              progress: 100
            }
          : step.id === ROOM_GENERATION_STEP_ID
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
        currentStep: steps[steps.length - 1]?.label || COMPLETED_STEP_LABEL,
        currentStepIndex: steps.length - 1,
        overallProgress: 100
      };
    });
  }, [createCompletedProgress]);

  const markFinalStepFailed = useCallback(
    (message: string) => {
      setGenerationProgress((prev) => {
        if (!prev) {
          return {
            ...createCompletedProgress(),
            steps: [
              {
                id: ROOM_GENERATION_STEP_ID,
                label: ROOM_STEP_LABEL,
                status: "completed",
                progress: 100
              },
              {
                id: FINAL_COMPOSE_STEP_ID,
                label: COMPLETED_STEP_LABEL,
                status: "failed",
                error: message
              }
            ]
          };
        }
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
    },
    [createCompletedProgress]
  );

  const syncRoomProgress = useCallback(
    (rooms: RoomGenerationStatus[]) => {
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
    },
    [
      markFinalStepInProgress,
      markRoomGenerationFailed,
      updateRoomGenerationStep
    ]
  );

  const applyInitialStatusPayload = useCallback(
    (
      projectId: string,
      payload: InitialVideoStatusPayload,
      suppressNotifications = false
    ) => {
      const normalizedRooms = normalizeRoomStatuses(payload.jobs || []);
      setRoomStatuses(() => {
        syncRoomProgress(normalizedRooms);
        return normalizedRooms;
      });

      setStatusCache((prev) => {
        if (prev[projectId] === payload) {
          return prev;
        }
        return {
          ...prev,
          [projectId]: payload
        };
      });

      const hasIncompleteRooms = normalizedRooms.some(
        (room) => room.status !== "completed"
      );
      const hasJobsWithoutFinalVideo =
        normalizedRooms.length > 0 && !payload.finalVideo;
      const finalStatus = payload.finalVideo?.status ?? null;
      const finalVideoReady =
        finalStatus === "completed" && Boolean(payload.finalVideo?.finalVideoUrl);

      if (finalVideoReady) {
        setFinalVideo({
          videoUrl: payload.finalVideo.finalVideoUrl,
          thumbnailUrl: payload.finalVideo.thumbnailUrl ?? null,
          duration: payload.finalVideo.duration ?? null
        });
        setCurrentProject((prev) => {
          if (!prev || prev.id !== payload.finalVideo?.projectId) {
            return prev;
          }

          return {
            ...prev,
            thumbnailUrl:
              payload.finalVideo?.thumbnailUrl ?? prev.thumbnailUrl ?? null
          };
        });
        markFinalStepCompleted();
        setWorkflowStage("complete");
        stopStatusPolling();
        if (
          !suppressNotifications &&
          finalStatusNotifiedRef.current !== "success"
        ) {
          toast.success("Generation complete!", {
            description: "Your property video is ready."
          });
          finalStatusNotifiedRef.current = "success";
        }
        return;
      }

      if (finalStatus === "failed") {
        const message =
          payload.finalVideo.errorMessage || "Final composition failed";
        setFinalVideo(null);
        markFinalStepFailed(message);
        stopStatusPolling();
        setWorkflowStage("generate", false);
        if (
          !suppressNotifications &&
          finalStatusNotifiedRef.current !== "error"
        ) {
          toast.error("Generation failed", {
            description: message
          });
          finalStatusNotifiedRef.current = "error";
        }
        return;
      }

      if (hasIncompleteRooms || hasJobsWithoutFinalVideo) {
        setWorkflowStage("generate", false);
      }
      setFinalVideo(null);
    },
    [
      markFinalStepCompleted,
      markFinalStepFailed,
      setWorkflowStage,
      stopStatusPolling,
      syncRoomProgress
    ]
  );

  const fetchStatus = useCallback(
    async (projectId: string, suppressNotifications = false) => {
      try {
        const response = await fetch(`/api/v1/video/status/${projectId}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }
        const data = (await response.json()) as {
          success: boolean;
          data: InitialVideoStatusPayload | undefined;
        };
        if (!data.success || !data.data) {
          return;
        }
        setProjectStatus(data.data);
        applyInitialStatusPayload(projectId, data.data, suppressNotifications);
        return data.data;
      } catch (error) {
        console.error("Failed to fetch video status:", error);
      }
    },
    [applyInitialStatusPayload]
  );

  // Load existing project data when modal opens with an existing project
  useEffect(() => {
    async function loadExistingProject() {
      if (!isOpen || !existingProject || !user) return;
      if (loadedProjectKey === currentProjectKey) return;

      try {
        // Set project info
        setCurrentProject(existingProject);
        setCurrentStage(existingProject.stage ?? "upload");
        pendingStageRef.current = null;
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
            previewUrl: "", // Empty string to force getImageDisplaySrc to use url field
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
        }

        if (cachedStatus) {
          applyInitialStatusPayload(existingProject.id, cachedStatus, true);
        }

        const hasCachedFinalVideo =
          cachedStatus?.finalVideo?.status === "completed" &&
          Boolean(cachedStatus.finalVideo.finalVideoUrl);

        const shouldFetchStatus =
          !cachedStatus ||
          (existingProject.stage === "complete" && !hasCachedFinalVideo);

        if (shouldFetchStatus) {
          await fetchStatus(existingProject.id, true);
        }

        setLoadedProjectKey(currentProjectKey);
      } catch (error) {
        console.error("Failed to load existing project:", error);
        toast.error("Failed to load project data");
      }
    }

    loadExistingProject();
  }, [
    applyInitialStatusPayload,
    cachedStatus,
    currentProjectKey,
    existingProject,
    fetchStatus,
    isOpen,
    loadedProjectKey,
    user
  ]);

  const startStatusPolling = useCallback(
    (projectId: string | null) => {
      if (!projectId || typeof window === "undefined") {
        return;
      }

      if (pollingActiveRef.current) {
        return;
      }

      pollingActiveRef.current = true;
      finalStatusNotifiedRef.current = null;

      const now = Date.now();
      if (generationStartRef.current === null) {
        generationStartRef.current = now;
      }
      const elapsed = now - generationStartRef.current;
      const delay = Math.max(POLLING_DELAY_MS - elapsed, 0);

      pollDelayTimeoutRef.current = setTimeout(() => {
        pollDelayTimeoutRef.current = null;
        void fetchStatus(projectId);
        pollIntervalRef.current = setInterval(() => {
          void fetchStatus(projectId);
        }, POLLING_INTERVAL_MS);
      }, delay);
    },
    [fetchStatus]
  );

  useEffect(() => {
    if (!isOpen || currentStage !== "generate" || !currentProject) {
      stopStatusPolling();
      return;
    }

    const finalStatus = projectStatus?.finalVideo?.status;
    const isFinalized = finalStatus === "completed" || finalStatus === "failed";

    if (isFinalized) {
      stopStatusPolling();
      return;
    }

    startStatusPolling(currentProject.id);
  }, [
    currentProject,
    currentProject?.id,
    currentStage,
    isOpen,
    projectStatus?.finalVideo?.status,
    startStatusPolling,
    stopStatusPolling
  ]);

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

    setRoomStatuses([]);
    setFinalVideo(null);
    setProjectStatus(null);

    try {
      stopStatusPolling();
      initializeGenerationProgress(totalRooms);
      setWorkflowStage("generate");

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
    } catch (error) {
      stopStatusPolling();
      setGenerationProgress(null);
      setWorkflowStage("review");
      setRoomStatuses([]);
      setFinalVideo(null);
      console.error("Generation failed:", error);
      toast.error("Generation failed", {
        description:
          error instanceof Error ? error.message : "Please try again."
      });
    }
  };

  // Determine modal size based on current stage
  const getModalClassName = () => {
    if (currentStage === "generate" || currentStage === "complete") {
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
          <WorkflowHeader
            currentStage={currentStage}
            categorizedGroupCount={categorizedGroups.length}
            categorizedImageCount={images.filter((img) => img.category).length}
            generationProgress={generationProgress}
            projectName={projectName}
            onProjectNameChange={setProjectName}
            isSavingName={isSavingName}
          />

          <StageContent
            stage={currentStage}
            images={images}
            setImages={setImages}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
            categorizedGroups={categorizedGroups}
            setCategorizedGroups={setCategorizedGroups}
            availableCategories={availableCategories}
            videoSettings={videoSettings}
            setVideoSettings={setVideoSettings}
            setWorkflowStage={setWorkflowStage}
            setInternalIsOpen={setInternalIsOpen}
            onConfirmReview={handleConfirmAndGenerate}
            generationProgress={generationProgress}
            roomStatuses={roomStatuses}
            finalVideo={finalVideo}
            onCancelGenerate={() => {
              stopStatusPolling();
              setWorkflowStage("review");
              setGenerationProgress(null);
              setRoomStatuses([]);
              setFinalVideo(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <CloseWorkflowDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        onConfirm={handleConfirmClose}
      />
    </>
  );
}
