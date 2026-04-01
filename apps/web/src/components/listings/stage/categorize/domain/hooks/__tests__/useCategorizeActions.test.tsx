import { act, renderHook } from "@testing-library/react";
import {
  useCategorizeActions
} from "@web/src/components/listings/stage/categorize/domain/hooks/useCategorizeActions";
import {
  UNUSED_DOCK_DROP_ZONE_ID
} from "@web/src/components/listings/stage/categorize/shared";

const mockToastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

const buildParams = (
  overrides: Partial<Parameters<typeof useCategorizeActions>[0]> = {}
) => {
  const params: Parameters<typeof useCategorizeActions>[0] = {
    images: [
      { id: "img1", url: "", filename: "a.jpg", category: null },
      {
        id: "img2",
        url: "",
        filename: "b.jpg",
        category: "kitchen",
        workspacePlacement: "used"
      }
    ],
    categoryOrder: ["needs-categorization", "kitchen"],
    customCategories: [],
    categoryDialogCategory: null,
    deleteCategory: null,
    moveImageId: "img1",
    deleteImageId: "img1",
    categoryUsageCounts: {
      kitchen: 1
    },
    placementOverrides: {},
    setImages: jest.fn(),
    setPlacementOverrides: jest.fn(),
    setCustomCategories: jest.fn(),
    setIsCategoryDialogOpen: jest.fn(),
    setDeleteCategory: jest.fn(),
    setMoveImageId: jest.fn(),
    setDeleteImageId: jest.fn(),
    setIsDraggingImage: jest.fn(),
    setDragOverCategory: jest.fn(),
    persistImageAssignments: jest.fn().mockResolvedValue(true),
    endDragSession: jest.fn()
  };
  return { ...params, ...overrides };
};

describe("useCategorizeActions", () => {
  beforeEach(() => {
    mockToastError.mockReset();
  });

  it("creates a category and closes the dialog", () => {
    const params = buildParams();
    const { result } = renderHook(() => useCategorizeActions(params));

    act(() => {
      result.current.handleCreateCategory("sunroom");
    });

    expect(params.setCustomCategories).toHaveBeenCalledTimes(1);
    expect(params.setIsCategoryDialogOpen).toHaveBeenCalledWith(false);
  });

  it("creates incremented multi-room categories", () => {
    const params = buildParams({
      categoryOrder: ["bedroom", "bedroom-2"]
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    act(() => {
      result.current.handleCreateCategory("bedroom");
    });

    expect(mockToastError).not.toHaveBeenCalled();
    expect(params.setCustomCategories).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate single-room category names", () => {
    const params = buildParams({
      categoryOrder: ["needs-categorization", "kitchen"]
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    act(() => {
      result.current.handleCreateCategory("Kitchen");
    });

    expect(mockToastError).toHaveBeenCalledWith("That room already exists.");
  });

  it("rejects vague other categories", () => {
    const params = buildParams();
    const { result } = renderHook(() => useCategorizeActions(params));

    act(() => {
      result.current.handleCreateCategory("other");
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Please choose a specific room category."
    );
    expect(params.setCustomCategories).not.toHaveBeenCalled();
  });

  it("blocks moving used images into categories already at the used-image limit", async () => {
    const params = buildParams({
      images: [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: "living-room",
          workspacePlacement: "used"
        }
      ],
      moveImageId: "img1",
      categoryUsageCounts: {
        kitchen: 3,
        "living-room": 1
      },
      placementOverrides: {
        img1: "used"
      }
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleMoveImage("kitchen");
    });

    expect(mockToastError).toHaveBeenCalled();
    expect(params.persistImageAssignments).not.toHaveBeenCalled();
  });

  it("deletes image and clears selected delete id on success", async () => {
    const params = buildParams({
      placementOverrides: { img1: "dock" }
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleDeleteImage();
    });

    expect(params.persistImageAssignments).toHaveBeenCalled();
    expect(params.setDeleteImageId).toHaveBeenCalledWith(null);
    expect(params.setPlacementOverrides).toHaveBeenCalled();
  });

  it("restores images when deleting fails to persist", async () => {
    const params = buildParams({
      persistImageAssignments: jest.fn().mockImplementation(
        async (
          _updates: Array<{ id: string; category: string | null }>,
          _deletions: string[],
          rollback?: () => void
        ) => {
          rollback?.();
          return false;
        }
      )
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleDeleteImage();
    });

    expect(params.setImages).toHaveBeenCalledTimes(2);
    expect(params.setDeleteImageId).not.toHaveBeenCalledWith(null);
  });

  it("renames categories and persists updates", async () => {
    const params = buildParams({
      images: [
        { id: "img1", url: "", filename: "a.jpg", category: "office" },
        { id: "img2", url: "", filename: "b.jpg", category: "office" }
      ],
      categoryOrder: ["office"],
      customCategories: ["office"],
      categoryDialogCategory: "office"
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleEditCategory("study");
    });

    expect(params.setImages).toHaveBeenCalled();
    expect(params.persistImageAssignments).toHaveBeenCalled();
    expect(params.setIsCategoryDialogOpen).toHaveBeenCalledWith(false);
  });

  it("closes the category dialog without persisting when the edit keeps the same category", async () => {
    const params = buildParams({
      categoryOrder: ["kitchen"],
      categoryDialogCategory: "kitchen"
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleEditCategory("Kitchen");
    });

    expect(params.persistImageAssignments).not.toHaveBeenCalled();
    expect(params.setIsCategoryDialogOpen).toHaveBeenCalledWith(false);
  });

  it("deletes category and moves images to uncategorized", async () => {
    const params = buildParams({
      images: [
        { id: "img1", url: "", filename: "a.jpg", category: "office" },
        { id: "img2", url: "", filename: "b.jpg", category: "kitchen" }
      ],
      customCategories: ["office"],
      deleteCategory: "office"
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleDeleteCategory();
    });

    expect(params.persistImageAssignments).toHaveBeenCalled();
    expect(params.setDeleteCategory).toHaveBeenCalledWith(null);
  });

  it("rolls back category edits when persistence fails", async () => {
    const params = buildParams({
      images: [
        { id: "img1", url: "", filename: "a.jpg", category: "office" },
        { id: "img2", url: "", filename: "b.jpg", category: "office" }
      ],
      categoryOrder: ["office"],
      customCategories: ["office"],
      categoryDialogCategory: "office",
      persistImageAssignments: jest.fn().mockImplementation(
        async (
          _updates: Array<{ id: string; category: string | null }>,
          _deletions: string[],
          rollback?: () => void
        ) => {
          rollback?.();
          return false;
        }
      )
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleEditCategory("study");
    });

    expect(params.setImages).toHaveBeenCalledTimes(2);
    expect(params.setCustomCategories).toHaveBeenCalledTimes(2);
    expect(params.setIsCategoryDialogOpen).not.toHaveBeenCalledWith(false);
  });

  it("moves image and clears move dialog state on success", async () => {
    const params = buildParams({
      images: [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: null,
          workspacePlacement: "dock"
        },
        {
          id: "img2",
          url: "",
          filename: "b.jpg",
          category: "kitchen",
          workspacePlacement: "used"
        }
      ],
      moveImageId: "img1"
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleMoveImage("kitchen");
    });

    expect(params.persistImageAssignments).toHaveBeenCalled();
    expect(params.setMoveImageId).toHaveBeenCalledWith(null);
  });

  it("closes the move dialog when the image already belongs to the target category", async () => {
    const params = buildParams({
      images: [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: "kitchen",
          workspacePlacement: "dock"
        }
      ],
      moveImageId: "img1"
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleMoveImage("kitchen");
    });

    expect(params.setMoveImageId).toHaveBeenCalledWith(null);
    expect(params.persistImageAssignments).not.toHaveBeenCalled();
  });

  it("returns early when no move image or delete category is selected", async () => {
    const params = buildParams({
      moveImageId: null,
      deleteCategory: null
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleMoveImage("kitchen");
      await result.current.handleDeleteCategory();
    });

    expect(params.persistImageAssignments).not.toHaveBeenCalled();
  });

  it("moves selected images into the uncategorized bucket", async () => {
    const params = buildParams({
      images: [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: "kitchen",
          workspacePlacement: "used"
        }
      ],
      moveImageId: "img1"
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleMoveImage("needs-categorization");
    });

    expect(params.persistImageAssignments).toHaveBeenCalledWith(
      [{ id: "img1", category: null }],
      [],
      expect.any(Function)
    );
  });

  it("moves dropped images into the dock without persisting category changes", async () => {
    const params = buildParams();
    const { result } = renderHook(() => useCategorizeActions(params));
    const preventDefault = jest.fn();
    const getData = jest.fn(() => "img1");

    await act(async () => {
      await result.current.handleDrop(UNUSED_DOCK_DROP_ZONE_ID)({
        preventDefault,
        dataTransfer: { getData }
      } as never);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(params.setPlacementOverrides).toHaveBeenCalledTimes(1);
    expect(params.persistImageAssignments).not.toHaveBeenCalled();
    expect(params.setDragOverCategory).toHaveBeenCalledWith(null);
  });

  it("does not persist when a used image is dropped back into the same used category", async () => {
    const params = buildParams({
      images: [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: "kitchen",
          workspacePlacement: "used"
        }
      ],
      placementOverrides: {
        img1: "used"
      }
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleDrop("kitchen")({
        preventDefault: jest.fn(),
        dataTransfer: {
          getData: () => "img1"
        }
      } as never);
    });

    expect(params.persistImageAssignments).not.toHaveBeenCalled();
    expect(params.setDragOverCategory).toHaveBeenCalledWith(null);
  });

  it("restores placement and images when a dropped category change rolls back", async () => {
    const params = buildParams({
      images: [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: "living-room",
          workspacePlacement: "dock"
        }
      ],
      persistImageAssignments: jest.fn().mockImplementation(
        async (
          _updates: Array<{ id: string; category: string | null }>,
          _deletions: string[],
          rollback?: () => void
        ) => {
          rollback?.();
        }
      )
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleDrop("kitchen")({
        preventDefault: jest.fn(),
        dataTransfer: {
          getData: () => "img1"
        }
      } as never);
    });

    expect(params.setImages).toHaveBeenCalledTimes(2);
    expect(params.setPlacementOverrides).toHaveBeenCalledTimes(2);
    expect(params.setDragOverCategory).toHaveBeenCalledWith(null);
  });

  it("drag handlers set transfer payload and end drag session", () => {
    const params = buildParams();
    const { result } = renderHook(() => useCategorizeActions(params));
    const setData = jest.fn();
    const event = {
      dataTransfer: {
        setData,
        effectAllowed: ""
      }
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.handleDragStart("img1")(event);
      result.current.handleDragEnd();
    });

    expect(setData).toHaveBeenCalledWith("text/plain", "img1");
    expect(params.setIsDraggingImage).toHaveBeenCalledWith(true);
    expect(params.endDragSession).toHaveBeenCalled();
  });

  it("drops images into the dock without persisting category changes", async () => {
    const params = buildParams({
      images: [
        {
          id: "img2",
          url: "",
          filename: "b.jpg",
          category: "kitchen",
          workspacePlacement: "used"
        }
      ],
      placementOverrides: {
        img2: "used"
      }
    });
    const { result } = renderHook(() => useCategorizeActions(params));
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { getData: () => "img2" }
    } as unknown as React.DragEvent<HTMLDivElement>;

    await act(async () => {
      await result.current.handleDrop(UNUSED_DOCK_DROP_ZONE_ID)(dropEvent);
    });

    expect(params.setPlacementOverrides).toHaveBeenCalled();
    expect(params.persistImageAssignments).not.toHaveBeenCalled();
  });

  it("clears drag-over state when dropping a used image into the same category", async () => {
    const params = buildParams({
      images: [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: "kitchen",
          workspacePlacement: "used"
        }
      ],
      placementOverrides: {
        img1: "used"
      }
    });
    const { result } = renderHook(() => useCategorizeActions(params));
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { getData: () => "img1" }
    } as unknown as React.DragEvent<HTMLDivElement>;

    await act(async () => {
      await result.current.handleDrop("kitchen")(dropEvent);
    });

    expect(params.setDragOverCategory).toHaveBeenCalledWith(null);
    expect(params.persistImageAssignments).not.toHaveBeenCalled();
  });

  it("ignores drops with no dragged image id", async () => {
    const params = buildParams();
    const { result } = renderHook(() => useCategorizeActions(params));
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { getData: () => "" }
    } as unknown as React.DragEvent<HTMLDivElement>;

    await act(async () => {
      await result.current.handleDrop("kitchen")(dropEvent);
    });

    expect(params.setPlacementOverrides).not.toHaveBeenCalled();
    expect(params.persistImageAssignments).not.toHaveBeenCalled();
  });

  it("blocks dragging docked images into a full used category", async () => {
    const params = buildParams({
      images: [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: "kitchen",
          workspacePlacement: "dock"
        }
      ],
      categoryUsageCounts: {
        kitchen: 3
      },
      placementOverrides: {
        img1: "dock"
      }
    });
    const { result } = renderHook(() => useCategorizeActions(params));
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { getData: () => "img1" }
    } as unknown as React.DragEvent<HTMLDivElement>;

    await act(async () => {
      await result.current.handleDrop("kitchen")(dropEvent);
    });

    expect(mockToastError).toHaveBeenCalled();
    expect(params.persistImageAssignments).not.toHaveBeenCalled();
  });
});
