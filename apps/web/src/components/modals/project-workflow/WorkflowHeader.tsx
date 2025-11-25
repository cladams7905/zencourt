"use client";

import { DialogHeader, DialogTitle } from "../../ui/dialog";
import { ProjectNameInput } from "../../workflow/ProjectNameInput";
import type { GenerationProgress } from "@web/src/types/workflow";
import type { ProjectStage } from "@shared/types/models";

interface WorkflowHeaderProps {
  currentStage: ProjectStage;
  categorizedGroupCount: number;
  categorizedImageCount: number;
  generationProgress: GenerationProgress | null;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  isSavingName: boolean;
}

export function WorkflowHeader({
  currentStage,
  categorizedGroupCount,
  categorizedImageCount,
  generationProgress,
  projectName,
  onProjectNameChange,
  isSavingName
}: WorkflowHeaderProps) {
  return (
    <DialogHeader className="border-b">
      <ProjectNameInput
        value={projectName}
        onChange={onProjectNameChange}
        placeholder="Untitled Project"
        isSaving={isSavingName}
      />
      <WorkflowHeadingContent
        currentStage={currentStage}
        categorizedGroupCount={categorizedGroupCount}
        categorizedImageCount={categorizedImageCount}
        generationProgress={generationProgress}
      />
      <DialogTitle className="hidden">Project Workflow</DialogTitle>
    </DialogHeader>
  );
}

interface WorkflowHeadingContentProps {
  currentStage: ProjectStage;
  categorizedGroupCount: number;
  categorizedImageCount: number;
  generationProgress: GenerationProgress | null;
}

function WorkflowHeadingContent({
  currentStage,
  categorizedGroupCount,
  categorizedImageCount,
  generationProgress
}: WorkflowHeadingContentProps) {
  const baseClass = "sticky top-0 bg-white z-30 px-6 py-4 border-t";

  switch (currentStage) {
    case "upload":
      return (
        <div className={baseClass}>
          <h2 className="text-xl font-semibold">Choose Images to Upload</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Click to upload or drag and drop images of your property listing to
            generate content from.
          </p>
        </div>
      );
    case "categorize":
      if (categorizedGroupCount === 0) {
        break;
      }
      return (
        <div className={baseClass}>
          <h2 className="text-xl font-semibold">Review Categorized Images</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {categorizedGroupCount} categories found with{" "}
            {categorizedImageCount} images
          </p>
        </div>
      );
    case "plan":
      return (
        <div className={baseClass}>
          <h2 className="text-xl font-semibold">Configure Your Video</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your property walkthrough video settings
          </p>
        </div>
      );
    case "review":
      return (
        <div className={baseClass}>
          <h2 className="text-xl font-semibold">Review Your Project</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Confirm your images and selected media before generating
          </p>
        </div>
      );
    case "generate":
      return (
        <div className={baseClass}>
          <h2 className="text-xl font-semibold">
            {generationProgress?.steps?.every((s) => s.status === "completed")
              ? "Generation Complete!"
              : generationProgress?.steps?.some((s) => s.status === "failed")
              ? "Generation Failed"
              : "Generating Your Content"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {generationProgress?.steps?.every((s) => s.status === "completed")
              ? "Your content has been successfully generated"
              : generationProgress?.steps?.some((s) => s.status === "failed")
              ? "Some steps encountered errors"
              : "Creating video from your images"}
          </p>
        </div>
      );
    case "complete":
      return (
        <div className={baseClass}>
          <h2 className="text-xl font-semibold">Generation Complete</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Preview and download your video
          </p>
        </div>
      );
    default:
      break;
  }
}
