"use client";

import type { ListingStageStep } from "@web/src/components/listings/stage/shared";

export type ListingStageKey = "address" | "upload" | "categorize" | "review" | "generate";

type StageStepDef = {
  key: ListingStageKey;
  label: string;
  sublabel: string;
};

const STAGE_STEP_DEFS: StageStepDef[] = [
  { key: "address", label: "1. Enter address", sublabel: "~30 sec" },
  { key: "upload", label: "2. Upload listing photos", sublabel: "~2 min" },
  { key: "categorize", label: "3. Categorize photos", sublabel: "~2 min" },
  { key: "review", label: "4. Review details", sublabel: "~1 min" },
  { key: "generate", label: "5. Generate content", sublabel: "~4-7 min" }
];

export function buildListingStageFlowSteps(activeStep: ListingStageKey): ListingStageStep[] {
  return STAGE_STEP_DEFS.map((step) => ({
    label: step.label,
    sublabel: step.sublabel,
    active: step.key === activeStep
  }));
}
