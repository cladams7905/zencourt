import { createPlanNavigationSnapshot, isPlanDirtyAgainstDefault } from "../navigationGuard";
import type { ListingImageItem } from "@web/src/components/listings/stage/plan/shared/types";

function makeImage(
  overrides: Partial<ListingImageItem> = {}
): ListingImageItem {
  return {
    id: "img-1",
    url: "https://example.com/img.jpg",
    filename: "img.jpg",
    category: "kitchen",
    workspacePlacement: "used",
    metadata: {
      width: 1000,
      height: 750,
      format: "jpeg",
      size: 100,
      lastModified: 1,
      perspective: "ground",
      videoScene: {
        selected: true,
        motionVariantId: "tracking"
      }
    },
    ...overrides
  };
}

describe("plan navigation guard snapshot", () => {
  it("tracks explicit empty spaces alongside image state", () => {
    const snapshot = createPlanNavigationSnapshot({
      workspaceImages: [makeImage()],
      explicitCategories: ["patio"]
    });

    expect(snapshot).toEqual({
      explicitCategories: ["patio"],
      imageStates: [
        {
          category: "kitchen",
          id: "img-1",
          motionVariantId: "tracking-left",
          workspacePlacement: "used"
        }
      ]
    });
  });

  it("treats the plan as dirty only when the current snapshot differs from both the initial and default plans", () => {
    const initialSnapshot = createPlanNavigationSnapshot({
      workspaceImages: [makeImage({ workspacePlacement: "dock" })],
      explicitCategories: []
    });
    const defaultSnapshot = createPlanNavigationSnapshot({
      workspaceImages: [makeImage()],
      explicitCategories: []
    });
    const currentSnapshot = createPlanNavigationSnapshot({
      workspaceImages: [makeImage({ category: "living-room" })],
      explicitCategories: ["patio"]
    });

    expect(
      isPlanDirtyAgainstDefault({
        currentSnapshot,
        defaultSnapshot,
        initialSnapshot
      })
    ).toBe(true);
    expect(
      isPlanDirtyAgainstDefault({
        currentSnapshot: defaultSnapshot,
        defaultSnapshot,
        initialSnapshot
      })
    ).toBe(false);
    expect(
      isPlanDirtyAgainstDefault({
        currentSnapshot: initialSnapshot,
        defaultSnapshot,
        initialSnapshot
      })
    ).toBe(false);
  });
});
