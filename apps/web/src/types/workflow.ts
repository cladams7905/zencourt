/**
 * Campaign Workflow Types
 *
 * Type definitions for the multi-stage campaign creation workflow
 */

import { DBCampaign, VideoStatus, CampaignStage } from "@shared/types/models";
import type { ProcessedImage } from "./images";
import { CategorizedGroup } from "./vision";

// ============================================================================
// Generation Progress Types
// ============================================================================

/**
 * Status of a generation step
 */
export type GenerationStepStatus =
  | "completed"
  | "in-progress"
  | "waiting"
  | "failed";

/**
 * Individual step in the generation process
 */
export interface GenerationStep {
  id: string;
  label: string;
  status: GenerationStepStatus;
  progress?: number; // 0-100, only for in-progress
  duration?: number; // actual duration in seconds (for completed)
  error?: string; // error message (for failed)
}

/**
 * Overall generation progress tracking
 */
export interface GenerationProgress {
  currentStep: string; // Human-readable step name
  totalSteps: number;
  currentStepIndex: number; // 0-based index
  estimatedTimeRemaining: number; // in seconds
  overallProgress: number; // 0-100
  steps: GenerationStep[];
}

/**
 * Per-room clip generation status used by the Generate stage UI
 */
export interface RoomGenerationStatus {
  id: string;
  roomId: string | null;
  roomName: string | null;
  status: VideoStatus;
  videoUrl?: string | null;
  errorMessage?: string | null;
  sortOrder?: number | null;
}

// ============================================================================
// Workflow State Types
// ============================================================================

/**
 * Complete state for the campaign workflow modal
 */
export interface WorkflowState {
  // Current stage
  currentStage: CampaignStage;

  // Campaign information
  campaignName: string;
  currentCampaign: DBCampaign | null;

  // Image data
  images: ProcessedImage[];
  categorizedGroups: CategorizedGroup[];

  // Progress tracking
  isProcessing: boolean;
  generationProgress: GenerationProgress | null;
}

/**
 * Final composed video details shown in the workflow
 */
export interface FinalVideoData {
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
}

// ============================================================================
// Extended Project Type
// ============================================================================

/**
 * Campaign with workflow-specific fields
 */
export interface CampaignWithWorkflow extends DBCampaign {
  workflowStage?: CampaignStage;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of stage validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validation function type for stage transitions
 */
export type StageValidator = (state: WorkflowState) => ValidationResult;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a workflow stage is before another stage
 */
export function isStageBefore(
  stage: CampaignStage,
  compareStage: CampaignStage
): boolean {
  const stages: CampaignStage[] = [
    "upload",
    "categorize",
    "plan",
    "review",
    "generate",
    "complete"
  ];
  return stages.indexOf(stage) < stages.indexOf(compareStage);
}

/**
 * Check if a workflow stage is after another stage
 */
export function isStageAfter(
  stage: CampaignStage,
  compareStage: CampaignStage
): boolean {
  const stages: CampaignStage[] = [
    "upload",
    "categorize",
    "plan",
    "review",
    "generate",
    "complete"
  ];
  return stages.indexOf(stage) > stages.indexOf(compareStage);
}

/**
 * Get all stages up to and including the specified stage
 */
export function getCompletedStages(
  currentStage: CampaignStage
): CampaignStage[] {
  const stages: CampaignStage[] = [
    "upload",
    "categorize",
    "plan",
    "review",
    "generate",
    "complete"
  ];
  const currentIndex = stages.indexOf(currentStage);
  return stages.slice(0, currentIndex);
}

/**
 * Get the next stage in the workflow
 */
export function getNextStage(
  currentStage: CampaignStage
): CampaignStage | null {
  const stages: CampaignStage[] = [
    "upload",
    "categorize",
    "plan",
    "review",
    "generate",
    "complete"
  ];
  const currentIndex = stages.indexOf(currentStage);
  return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
}

/**
 * Get the previous stage in the workflow
 */
export function getPreviousStage(
  currentStage: CampaignStage
): CampaignStage | null {
  const stages: CampaignStage[] = [
    "upload",
    "categorize",
    "plan",
    "review",
    "generate",
    "complete"
  ];
  const currentIndex = stages.indexOf(currentStage);
  return currentIndex > 0 ? stages[currentIndex - 1] : null;
}
