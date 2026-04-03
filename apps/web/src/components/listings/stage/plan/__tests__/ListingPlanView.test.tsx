import type * as React from "react";
import { render, screen } from "@testing-library/react";
import { ListingPlanView } from "@web/src/components/listings/stage/plan/ListingPlanView";

const mockUsePlanDerivedState = jest.fn();
const mockUsePlanMutations = jest.fn();
const mockUsePlanListingDetails = jest.fn();
const mockUsePlanProcessingFlow = jest.fn();
const mockUsePlanActions = jest.fn();
const mockUseUnsavedNavigationGuard = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn()
  })
}));

jest.mock("@web/src/components/listings/stage/plan", () => ({
  PlanImageWorkspace: () => <div>workspace</div>,
  PlanUnusedDock: () => <div>unused-dock</div>,
  ListingCategoryDeleteDialog: () => null,
  ListingCategoryDialog: () => null
}));

jest.mock("@web/src/components/listings/stage/plan/domain", () => ({
  usePlanActions: (...args: unknown[]) => mockUsePlanActions(...args),
  usePlanConstraints: jest.fn(),
  usePlanListingDetails: (...args: unknown[]) => mockUsePlanListingDetails(...args),
  usePlanMutations: (...args: unknown[]) => mockUsePlanMutations(...args),
  usePlanDerivedState: (...args: unknown[]) => mockUsePlanDerivedState(...args)
}));

jest.mock("@web/src/components/shared/hooks/useUnsavedNavigationGuard", () => ({
  useUnsavedNavigationGuard: (...args: unknown[]) =>
    mockUseUnsavedNavigationGuard(...args)
}));

jest.mock("@web/src/components/listings/stage/plan/shared", () => ({
  categoryUsedDropZoneId: jest.fn(),
  UNUSED_DOCK_DROP_ZONE_ID: "unused-dock",
  useDragAutoScroll: () => ({ lastDragClientYRef: { current: null } })
}));

jest.mock("@web/src/components/listings/stage/shared", () => ({
  ListingStageShell: ({
    children,
    footer
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
  ListingStageFooter: ({
    validationMessages
  }: {
    validationMessages?: string[];
  }) => (
    <div>
      {validationMessages?.map((message) => (
        <div key={message}>{message}</div>
      ))}
    </div>
  )
}));

jest.mock("@web/src/components/listings/stage/processing/domain/hooks", () => ({
  clearStoredPlanProcessingBatch: jest.fn(),
  getStoredPlanProcessingBatch: jest.fn(() => null),
  usePlanProcessingFlow: (...args: unknown[]) => mockUsePlanProcessingFlow(...args)
}));

jest.mock("@web/src/components/listings/stage/upload/subcomponents/ListingUploadAiProcessingPanel", () => ({
  ListingUploadAiProcessingPanel: () => null
}));

describe("ListingPlanView", () => {
  beforeEach(() => {
    mockUseUnsavedNavigationGuard.mockReturnValue({
      confirmNavigation: jest.fn((navigate: () => void) => navigate())
    });
    mockUsePlanDerivedState.mockReturnValue({
      workspaceImages: [],
      dockedImages: [],
      usedImagesByCategory: {},
      accordionCategoryOrder: [],
      usedImageCount: 0,
      hasTooFewUsedImages: false,
      hasTooManyUsedImages: false,
      isUsedImageCountValid: true,
      maxUsedImagesTotal: 10,
      categoryOrder: [],
      baseCategoryCounts: {},
      hasEmptyCategory: true,
      emptyRoomCount: 2,
      hasCategoryWithoutPlannedVideo: false,
      hasTooManyCategories: false
    });
    mockUsePlanMutations.mockReturnValue({
      savingCount: 0,
      runDraftSave: jest.fn(),
      persistImageAssignments: jest.fn()
    });
    mockUsePlanListingDetails.mockReturnValue({
      addressValue: "123 Main St",
      handleContinue: jest.fn()
    });
    mockUsePlanProcessingFlow.mockReturnValue({
      status: "idle"
    });
    mockUsePlanActions.mockReturnValue({
      handleCreateCategory: jest.fn(),
      handleEditCategory: jest.fn(),
      handleDeleteCategory: jest.fn(),
      handleDragStart: jest.fn(),
      handleDragEnd: jest.fn(),
      handleDrop: jest.fn(),
      handleSceneMotionChange: jest.fn()
    });
  });

  it("uses space terminology in the empty category validation message", () => {
    render(
      <ListingPlanView
        title="Test"
        initialAddress="123 Main St"
        listingId="listing-1"
        initialImages={[]}
        hasPropertyDetails
      />
    );

    expect(
      screen.getByText(
        "You have 2 space(s) with no scenes assigned to them. Please assign at least one scene to each space or remove the empty space(s) to continue."
      )
    ).toBeInTheDocument();
  });

  it("configures the shared unsaved navigation guard message", () => {
    render(
      <ListingPlanView
        title="Test"
        initialAddress="123 Main St"
        listingId="listing-1"
        initialImages={[]}
        hasPropertyDetails
      />
    );

    expect(mockUseUnsavedNavigationGuard).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Unsaved changes to your video plan will be lost. Continue?"
      })
    );
  });
});
