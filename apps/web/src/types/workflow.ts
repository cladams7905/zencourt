/**
 * Listing Workflow Types
 *
 * Type definitions for the multi-stage listing creation workflow
 */

import { DBListing, VideoStatus, ListingStage } from "@shared/types/models";
import type { GENERATION_MODELS, VideoOrientation } from "@shared/types/models";
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
  category?: string | null;
  durationSeconds?: number | null;
  orientation?: VideoOrientation | null;
  generationModel?: GENERATION_MODELS | null;
  isPriorityCategory?: boolean;
  sortOrder?: number | null;
}

// ============================================================================
// Workflow State Types
// ============================================================================

/**
 * Complete state for the listing workflow modal
 */
export interface WorkflowState {
  // Current stage
  currentStage: ListingStage;

  // Listing information
  listingName: string;
  currentListing: DBListing | null;

  // Image data
  images: ProcessedImage[];
  categorizedGroups: CategorizedGroup[];

  // Progress tracking
  isProcessing: boolean;
  generationProgress: GenerationProgress | null;
}

// ============================================================================
// Extended Project Type
// ============================================================================

/**
 * Listing with workflow-specific fields
 */
export interface ListingWithWorkflow extends DBListing {
  workflowStage?: ListingStage;
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
  stage: ListingStage,
  compareStage: ListingStage
): boolean {
  const stages: ListingStage[] = [
    "categorize",
    "review",
    "generate",
    "create"
  ];
  return stages.indexOf(stage) < stages.indexOf(compareStage);
}

/**
 * Check if a workflow stage is after another stage
 */
export function isStageAfter(
  stage: ListingStage,
  compareStage: ListingStage
): boolean {
  const stages: ListingStage[] = [
    "categorize",
    "review",
    "generate",
    "create"
  ];
  return stages.indexOf(stage) > stages.indexOf(compareStage);
}

/**
 * Get all stages up to and including the specified stage
 */
export function getCompletedStages(
  currentStage: ListingStage
): ListingStage[] {
  const stages: ListingStage[] = [
    "categorize",
    "review",
    "generate",
    "create"
  ];
  const currentIndex = stages.indexOf(currentStage);
  return stages.slice(0, currentIndex);
}

/**
 * Get the next stage in the workflow
 */
export function getNextStage(
  currentStage: ListingStage
): ListingStage | null {
  const stages: ListingStage[] = [
    "categorize",
    "review",
    "generate",
    "create"
  ];
  const currentIndex = stages.indexOf(currentStage);
  return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
}

/**
 * Get the previous stage in the workflow
 */
export function getPreviousStage(
  currentStage: ListingStage
): ListingStage | null {
  const stages: ListingStage[] = [
    "categorize",
    "review",
    "generate",
    "create"
  ];
  const currentIndex = stages.indexOf(currentStage);
  return currentIndex > 0 ? stages[currentIndex - 1] : null;
}
