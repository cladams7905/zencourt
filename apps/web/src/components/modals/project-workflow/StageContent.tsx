"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ProcessedImage } from "@web/src/types/images";
import type { CategorizedGroup } from "@web/src/types/vision";
import type {
  DBAsset,
  DBCollection,
  DBProject,
  ProjectStage
} from "@shared/types/models";
import type {
  FinalVideoData,
  GenerationProgress,
  RoomGenerationStatus
} from "@web/src/types/workflow";
import { UploadStage } from "../../workflow/stages/UploadStage";
import { CategorizeStage } from "../../workflow/stages/CategorizeStage";
import { PlanStage, VideoSettings } from "../../workflow/stages/PlanStage";
import { ReviewStage } from "../../workflow/stages/ReviewStage";
import { GenerateStage } from "../../workflow/stages/GenerateStage";
import { CompleteStage } from "../../workflow/stages/CompleteStage";
import {
  UploadPreviewModal,
  CategorizedPreviewModal
} from "./ImagePreviewModals";

interface StageContentProps {
  stage: ProjectStage;
  images: ProcessedImage[];
  setImages: Dispatch<SetStateAction<ProcessedImage[]>>;
  currentProject: DBProject | null;
  setCurrentProject: Dispatch<SetStateAction<DBProject | null>>;
  currentCollection: DBCollection | null;
  setCurrentCollection: Dispatch<SetStateAction<DBCollection | null>>;
  currentAsset: DBAsset | null;
  setCurrentAsset: Dispatch<SetStateAction<DBAsset | null>>;
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
  currentCollection,
  setCurrentCollection,
  currentAsset,
  setCurrentAsset,
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
  const handleBackToUpload = () => setWorkflowStage("upload", false);
  const handleContinueCategorize = () => setWorkflowStage("plan");
  const handleBackToCategorize = () => setWorkflowStage("categorize", false);

  const handleContinuePlan = (settings: VideoSettings) => {
    setVideoSettings(settings);
    setWorkflowStage("review");
  };
  const handleBackToPlan = () => setWorkflowStage("plan", false);

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
          currentCollection={currentCollection}
          setCurrentCollection={setCurrentCollection}
          currentAsset={currentAsset}
          setCurrentAsset={setCurrentAsset}
          onImageClick={handleUploadImageClick}
          onContinue={handleContinueUpload}
        />
      )}

      {stage === "categorize" && (
        <CategorizeStage
          images={images}
          setImages={setImages}
          currentProject={currentProject}
          currentCollection={currentCollection}
          categorizedGroups={categorizedGroups}
          setCategorizedGroups={setCategorizedGroups}
          onImageClick={handleCategorizedImageClick}
          onBack={handleBackToUpload}
          onContinue={handleContinueCategorize}
        />
      )}

      {stage === "plan" && (
        <PlanStage
          categorizedGroups={categorizedGroups}
          availableCategories={availableCategories}
          onBack={handleBackToCategorize}
          onContinue={handleContinuePlan}
        />
      )}

      {stage === "review" && (
        <ReviewStage
          images={images}
          categorizedGroups={categorizedGroups}
          videoSettings={videoSettings || undefined}
          onBack={handleBackToPlan}
          onConfirm={handleReviewConfirm}
          isConfirming={isConfirming}
        />
      )}

      {stage === "generate" && generationProgress && (
        <GenerateStage
          progress={generationProgress}
          projectId={currentProject?.id}
          rooms={roomStatuses}
          onCancel={onCancelGenerate}
        />
      )}

      {stage === "complete" && (
        <CompleteStage finalVideo={finalVideo} projectId={currentProject?.id} />
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
