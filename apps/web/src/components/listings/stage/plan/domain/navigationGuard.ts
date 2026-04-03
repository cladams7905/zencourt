import type { ListingImageItem } from "@web/src/components/listings/stage/plan/shared/types";

export type PlanNavigationSnapshot = {
  explicitCategories: string[];
  imageStates: Array<{
    id: string;
    category: string | null;
    workspacePlacement: string;
    motionVariantId: string | null;
  }>;
};

export function createPlanNavigationSnapshot(args: {
  workspaceImages: ListingImageItem[];
  explicitCategories: string[];
}): PlanNavigationSnapshot {
  const { workspaceImages, explicitCategories } = args;

  return {
    explicitCategories: [...explicitCategories].sort((a, b) => a.localeCompare(b)),
    imageStates: [...workspaceImages]
      .map((image) => ({
        id: image.id,
        category: image.category ?? null,
        workspacePlacement: image.workspacePlacement ?? "dock",
        motionVariantId:
          image.workspacePlacement === "used"
            ? (image.metadata?.videoScene?.motionVariantId ?? "default")
            : null
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  };
}

function snapshotsEqual(
  left: PlanNavigationSnapshot,
  right: PlanNavigationSnapshot
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function isPlanDirtyAgainstDefault(args: {
  currentSnapshot: PlanNavigationSnapshot;
  defaultSnapshot: PlanNavigationSnapshot;
  initialSnapshot: PlanNavigationSnapshot;
}): boolean {
  const { currentSnapshot, defaultSnapshot, initialSnapshot } = args;
  return (
    !snapshotsEqual(currentSnapshot, initialSnapshot) &&
    !snapshotsEqual(currentSnapshot, defaultSnapshot)
  );
}
