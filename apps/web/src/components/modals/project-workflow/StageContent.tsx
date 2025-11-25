"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ProcessedImage } from "@web/src/types/images";
import type { CategorizedGroup } from "@web/src/types/vision";
import type { DBProject, ProjectStage } from "@shared/types/models";
import type {
  GenerationProgress,
  RoomGenerationStatus
} from "@web/src/types/workflow";
import { UploadStage } from "../../workflow/stages/UploadStage";
import { CategorizeStage } from "../../workflow/stages/CategorizeStage";
import { PlanStage, VideoSettings } from "../../workflow/stages/PlanStage";
import { ReviewStage } from "../../workflow/stages/ReviewStage";
import { GenerateStage } from "../../workflow/stages/GenerateStage";
import {
  UploadPreviewModal,
  CategorizedPreviewModal
} from "./ImagePreviewModals";

export interface FinalVideoData {
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
}

interface StageContentProps {
  stage: ProjectStage;
  images: ProcessedImage[];
  setImages: Dispatch<SetStateAction<ProcessedImage[]>>;
  currentProject: DBProject | null;
  setCurrentProject: Dispatch<SetStateAction<DBProject | null>>;
  categorizedGroups: CategorizedGroup[];
  setCategorizedGroups: Dispatch<SetStateAction<CategorizedGroup[]>>;
  availableCategories: string[];
  videoSettings: VideoSettings | null;
  setVideoSettings: Dispatch<SetStateAction<VideoSettings | null>>;
  setWorkflowStage: (stage: ProjectStage, persist?: boolean) => void;
  setInternalIsOpen: Dispatch<SetStateAction<boolean>>;
  onConfirmReview: () => Promise<void>;
  generationProgress: GenerationProgress | null;
  roomStatuses: RoomGenerationStatus[];
  finalVideo: FinalVideoData | null;
  onCancelGenerate: () => void;
}

export function StageContent({
  stage,
  images,
  setImages,
  currentProject,
  setCurrentProject,
  categorizedGroups,
  setCategorizedGroups,
  availableCategories,
  videoSettings,
  setVideoSettings,
  setWorkflowStage,
  setInternalIsOpen,
  onConfirmReview,
  generationProgress,
  roomStatuses,
  finalVideo,
  onCancelGenerate
}: StageContentProps) {
  const [previewImage, setPreviewImage] = useState<ProcessedImage | null>(null);
  const [previewImageFromGrid, setPreviewImageFromGrid] =
    useState<ProcessedImage | null>(null);
  const [previewIndexFromGrid, setPreviewIndexFromGrid] = useState<number>(0);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleUploadImageClick = (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image) return;
    setPreviewImage(image);
    setInternalIsOpen(false);
  };

  const handleCategorizedImageClick = (
    image: ProcessedImage,
    categoryIndex: number,
    imageIndex: number
  ) => {
    let globalIndex = 0;
    for (let i = 0; i < categoryIndex; i++) {
      globalIndex += categorizedGroups[i].images.length;
    }
    globalIndex += imageIndex;

    setPreviewImageFromGrid(image);
    setPreviewIndexFromGrid(globalIndex);
    setInternalIsOpen(false);
  };

  const handleContinueUpload = () => setWorkflowStage("categorize");
  const handleBackToUpload = () => setWorkflowStage("upload");
  const handleContinueCategorize = () => setWorkflowStage("plan");
  const handleBackToCategorize = () => setWorkflowStage("categorize");

  const handleContinuePlan = (settings: VideoSettings) => {
    setVideoSettings(settings);
    setWorkflowStage("review");
  };

  const handleBackToPlan = () => setWorkflowStage("plan");

  const handleReviewConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirmReview();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="relative flex-1 overflow-auto">
      {stage === "upload" && (
        <UploadStage
          images={images}
          setImages={setImages}
          currentProject={currentProject}
          setCurrentProject={setCurrentProject}
          onImageClick={handleUploadImageClick}
          onContinue={handleContinueUpload}
        />
      )}

      {stage === "categorize" && (
        <CategorizeStage
          images={images}
          setImages={setImages}
          currentProject={currentProject}
          categorizedGroups={categorizedGroups}
          setCategorizedGroups={setCategorizedGroups}
          onImageClick={handleCategorizedImageClick}
          onContinue={handleContinueCategorize}
          onBack={handleBackToUpload}
        />
      )}

      {stage === "plan" && (
        <PlanStage
          categorizedGroups={categorizedGroups}
          availableCategories={availableCategories}
          onContinue={handleContinuePlan}
          onBack={handleBackToCategorize}
        />
      )}

      {stage === "review" && (
        <ReviewStage
          images={images}
          categorizedGroups={categorizedGroups}
          videoSettings={videoSettings || undefined}
          onConfirm={handleReviewConfirm}
          onBack={handleBackToPlan}
          isConfirming={isConfirming}
        />
      )}

      {stage === "generate" && generationProgress && (
        <GenerateStage
          progress={generationProgress}
          projectId={currentProject?.id}
          rooms={roomStatuses}
          finalVideo={finalVideo}
          onCancel={onCancelGenerate}
        />
      )}

      <UploadPreviewModal
        previewImage={previewImage}
        images={images}
        onClose={() => {
          setPreviewImage(null);
          setInternalIsOpen(true);
        }}
        setPreviewImage={setPreviewImage}
      />

      <CategorizedPreviewModal
        previewImage={previewImageFromGrid}
        images={images}
        categorizedGroups={categorizedGroups}
        previewIndex={previewIndexFromGrid}
        onClose={() => {
          setPreviewImageFromGrid(null);
          setInternalIsOpen(true);
        }}
        setPreviewImage={setPreviewImageFromGrid}
        setPreviewIndex={setPreviewIndexFromGrid}
      />
    </div>
  );
}
