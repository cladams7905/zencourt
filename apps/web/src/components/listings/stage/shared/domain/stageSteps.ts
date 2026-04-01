import type { ListingStageStep } from "@web/src/components/listings/stage/shared";

export type ListingStageKey =
  | "address"
  | "upload"
  | "categorize"
  | "review"
  | "generate";

export type ListingStageScaffoldCopy = {
  stepTitle: string;
  stepSubtitle?: string;
};

type StageStepDef = {
  key: ListingStageKey;
  label: string;
  sublabel: string;
};

const STAGE_STEP_DEFS: StageStepDef[] = [
  { key: "address", label: "1. Enter Address", sublabel: "~30 sec" },
  { key: "upload", label: "2. Upload", sublabel: "~2 min" },
  { key: "categorize", label: "3. Categorize", sublabel: "~2 min" },
  { key: "review", label: "4. Review", sublabel: "~1 min" },
  { key: "generate", label: "5. Generate", sublabel: "~4-7 min" }
];

export function buildListingStageFlowSteps(
  activeStep: ListingStageKey
): ListingStageStep[] {
  const activeIndex = STAGE_STEP_DEFS.findIndex(
    (step) => step.key === activeStep
  );

  return STAGE_STEP_DEFS.map((step, index) => ({
    label: step.label,
    sublabel: step.sublabel,
    active: step.key === activeStep,
    completed: activeIndex > index
  }));
}

export function getListingStageScaffoldCopy(
  stage: ListingStageKey
): ListingStageScaffoldCopy {
  switch (stage) {
    case "address":
      return {
        stepTitle: "Step 1: Enter Listing Address",
        stepSubtitle:
          "We use this to title the listing and populate listing details."
      };
    case "upload":
      return {
        stepTitle: "Step 2: Upload listing photos",
        stepSubtitle:
          "Upload your full photo collection, up to 40 photos. No need to narrow it down now."
      };
    case "categorize":
      return {
        stepTitle: "Step 3: Categorize photos",
        stepSubtitle:
          "Group photos by room and confirm the listing address before continuing."
      };
    case "review":
      return {
        stepTitle: "Step 4: Review property details",
        stepSubtitle:
          "Confirm facts and sources before generating listing content."
      };
    case "generate":
      return {
        stepTitle: "Step 5: Generate content",
        stepSubtitle:
          "Video generation runs in the background. You can leave this page."
      };
  }
}
