import { act, renderHook } from "@testing-library/react";
import {
  usePlanActions
} from "@web/src/components/listings/stage/plan/domain/hooks/usePlanActions";
import {
  UNUSED_DOCK_DROP_ZONE_ID
} from "@web/src/components/listings/stage/plan/shared";

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args)
  }
}));

const buildParams = (
  overrides: Partial<Parameters<typeof usePlanActions>[0]> = {}
) => {
  const params: Parameters<typeof usePlanActions>[0] = {
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
    usedImagesByCategory: {},
    placementOverrides: {},
    setImages: jest.fn(),
    setPlacementOverrides: jest.fn(),
    setCustomCategories: jest.fn(),
    setIsCategoryDialogOpen: jest.fn(),
    setDeleteCategory: jest.fn(),
    setIsDraggingImage: jest.fn(),
    setDragOverCategory: jest.fn(),
    endDragSession: jest.fn()
  };
  return { ...params, ...overrides };
};

describe("usePlanActions", () => {
  beforeEach(() => {
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
  });

  it("creates a category and closes the dialog", () => {
    const params = buildParams();
    const { result } = renderHook(() => usePlanActions(params));

    act(() => {
      result.current.handleCreateCategory("sunroom");
    });

    expect(params.setCustomCategories).toHaveBeenCalledTimes(1);
    expect(params.setIsCategoryDialogOpen).toHaveBeenCalledWith(false);
    expect(mockToastSuccess).toHaveBeenCalledWith("Sunroom added to plan");
  });

  it("creates incremented multi-room categories", () => {
    const params = buildParams({
      categoryOrder: ["bedroom", "bedroom-2"]
    });
    const { result } = renderHook(() => usePlanActions(params));

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
    const { result } = renderHook(() => usePlanActions(params));

    act(() => {
      result.current.handleCreateCategory("Kitchen");
    });

    expect(mockToastError).toHaveBeenCalledWith("That room already exists.");
  });

  it("rejects vague other categories", () => {
    const params = buildParams();
    const { result } = renderHook(() => usePlanActions(params));

    act(() => {
      result.current.handleCreateCategory("other");
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Please choose a specific room category."
    );
    expect(params.setCustomCategories).not.toHaveBeenCalled();
  });

  it("renames categories locally and closes the dialog", async () => {
    const params = buildParams({
      images: [
        { id: "img1", url: "", filename: "a.jpg", category: "office" },
        { id: "img2", url: "", filename: "b.jpg", category: "office" }
      ],
      categoryOrder: ["office"],
      customCategories: ["office"],
      categoryDialogCategory: "office"
    });
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleEditCategory("study");
    });

    expect(params.setImages).toHaveBeenCalled();
    expect(params.setIsCategoryDialogOpen).toHaveBeenCalledWith(false);
  });

  it("closes the category dialog without persisting when the edit keeps the same category", async () => {
    const params = buildParams({
      categoryOrder: ["kitchen"],
      categoryDialogCategory: "kitchen"
    });
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleEditCategory("Kitchen");
    });

    expect(params.setIsCategoryDialogOpen).toHaveBeenCalledWith(false);
  });

  it("deletes category locally and moves images to uncategorized", async () => {
    const params = buildParams({
      images: [
        { id: "img1", url: "", filename: "a.jpg", category: "office" },
        { id: "img2", url: "", filename: "b.jpg", category: "kitchen" }
      ],
      customCategories: ["office"],
      deleteCategory: "office"
    });
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleDeleteCategory();
    });

    expect(params.setImages).toHaveBeenCalled();
    expect(params.setDeleteCategory).toHaveBeenCalledWith(null);
    expect(mockToastSuccess).toHaveBeenCalledWith("Office removed from plan");
  });

  it("does not depend on persistence to keep edited categories locally", async () => {
    const params = buildParams({
      images: [
        { id: "img1", url: "", filename: "a.jpg", category: "office" },
        { id: "img2", url: "", filename: "b.jpg", category: "office" }
      ],
      categoryOrder: ["office"],
      customCategories: ["office"],
      categoryDialogCategory: "office"
    });
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleEditCategory("study");
    });

    expect(params.setImages).toHaveBeenCalledTimes(1);
    expect(params.setCustomCategories).toHaveBeenCalledTimes(1);
    expect(params.setIsCategoryDialogOpen).toHaveBeenCalledWith(false);
  });

  it("returns early when delete category is not selected", async () => {
    const params = buildParams({
      deleteCategory: null
    });
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleDeleteCategory();
    });

    expect(params.setImages).not.toHaveBeenCalled();
  });

  it("moves dropped images into the dock locally without persisting", async () => {
    const params = buildParams();
    const { result } = renderHook(() => usePlanActions(params));
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
    expect(params.setImages).toHaveBeenCalledTimes(1);
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
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleDrop("kitchen")({
        preventDefault: jest.fn(),
        dataTransfer: {
          getData: () => "img1"
        }
      } as never);
    });

    expect(params.setDragOverCategory).toHaveBeenCalledWith(null);
  });

  it("updates placement and images locally when dropping into a new used category", async () => {
    const params = buildParams({
      images: [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: "living-room",
          workspacePlacement: "dock"
        }
      ]
    });
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleDrop("kitchen")({
        preventDefault: jest.fn(),
        dataTransfer: {
          getData: () => "img1"
        }
      } as never);
    });

    expect(params.setImages).toHaveBeenCalledTimes(1);
    expect(params.setPlacementOverrides).toHaveBeenCalledTimes(1);
    expect(params.setDragOverCategory).toHaveBeenCalledWith(null);
  });

  it("drag handlers set transfer payload and end drag session", () => {
    const params = buildParams();
    const { result } = renderHook(() => usePlanActions(params));
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

  it("drops images into the dock locally and preserves mutable planning state", async () => {
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
    const { result } = renderHook(() => usePlanActions(params));
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { getData: () => "img2" }
    } as unknown as React.DragEvent<HTMLDivElement>;

    await act(async () => {
      await result.current.handleDrop(UNUSED_DOCK_DROP_ZONE_ID)(dropEvent);
    });

    expect(params.setPlacementOverrides).toHaveBeenCalled();
    expect(params.setImages).toHaveBeenCalled();
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
    const { result } = renderHook(() => usePlanActions(params));
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { getData: () => "img1" }
    } as unknown as React.DragEvent<HTMLDivElement>;

    await act(async () => {
      await result.current.handleDrop("kitchen")(dropEvent);
    });

    expect(params.setDragOverCategory).toHaveBeenCalledWith(null);
  });

  it("ignores drops with no dragged image id", async () => {
    const params = buildParams();
    const { result } = renderHook(() => usePlanActions(params));
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { getData: () => "" }
    } as unknown as React.DragEvent<HTMLDivElement>;

    await act(async () => {
      await result.current.handleDrop("kitchen")(dropEvent);
    });

    expect(params.setPlacementOverrides).not.toHaveBeenCalled();
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
      placementOverrides: {
        img1: "dock"
      }
    });
    const { result } = renderHook(() => usePlanActions(params));
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { getData: () => "img1" }
    } as unknown as React.DragEvent<HTMLDivElement>;

    await act(async () => {
      await result.current.handleDrop("kitchen")(dropEvent);
    });

    expect(mockToastError).not.toHaveBeenCalled();
    expect(params.setImages).toHaveBeenCalledTimes(1);
    expect(params.setPlacementOverrides).toHaveBeenCalledTimes(1);
  });

  it("allows adding a recommended image even when the listing already exceeds the total cap", async () => {
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
      placementOverrides: {
        img1: "dock"
      }
    });
    const { result } = renderHook(() => usePlanActions(params));
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { getData: () => "img1" }
    } as unknown as React.DragEvent<HTMLDivElement>;

    await act(async () => {
      await result.current.handleDrop("kitchen")(dropEvent);
    });

    expect(mockToastError).not.toHaveBeenCalled();
    expect(params.setImages).toHaveBeenCalledTimes(1);
    expect(params.setPlacementOverrides).toHaveBeenCalledTimes(1);
  });

  it("preserves existing used images in the destination category when dragging another image into it", async () => {
    const params = buildParams({
      images: [
        {
          id: "src",
          url: "",
          filename: "src.jpg",
          category: "bedroom"
        },
        {
          id: "dest-1",
          url: "",
          filename: "dest-1.jpg",
          category: "kitchen"
        },
        {
          id: "dest-2",
          url: "",
          filename: "dest-2.jpg",
          category: "kitchen"
        }
      ],
      usedImagesByCategory: {
        kitchen: [
          {
            id: "dest-1",
            url: "",
            filename: "dest-1.jpg",
            category: "kitchen"
          },
          {
            id: "dest-2",
            url: "",
            filename: "dest-2.jpg",
            category: "kitchen"
          }
        ]
      },
      placementOverrides: {
        src: "used"
      }
    });
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleDrop("kitchen")({
        preventDefault: jest.fn(),
        dataTransfer: { getData: () => "src" }
      } as never);
    });

    expect(params.setPlacementOverrides).toHaveBeenCalledWith(
      expect.any(Function)
    );

    const updateOverrides = (params.setPlacementOverrides as jest.Mock).mock
      .calls[0][0] as (value: Record<string, "used" | "dock">) => Record<
      string,
      "used" | "dock"
    >;

    expect(updateOverrides({ src: "used" })).toEqual({
      src: "used",
      "dest-1": "used",
      "dest-2": "used"
    });
  });

  it("appends a cross-category drop to the end of the destination room list", async () => {
    const params = buildParams({
      images: [
        {
          id: "src",
          url: "",
          filename: "src.jpg",
          category: "bedroom",
          workspacePlacement: "used"
        },
        {
          id: "dest-1",
          url: "",
          filename: "dest-1.jpg",
          category: "kitchen",
          workspacePlacement: "used"
        },
        {
          id: "dest-2",
          url: "",
          filename: "dest-2.jpg",
          category: "kitchen",
          workspacePlacement: "used"
        },
        {
          id: "other-room",
          url: "",
          filename: "other-room.jpg",
          category: "living-room",
          workspacePlacement: "used"
        }
      ],
      usedImagesByCategory: {
        kitchen: [
          {
            id: "dest-1",
            url: "",
            filename: "dest-1.jpg",
            category: "kitchen",
            workspacePlacement: "used"
          },
          {
            id: "dest-2",
            url: "",
            filename: "dest-2.jpg",
            category: "kitchen",
            workspacePlacement: "used"
          }
        ]
      },
      placementOverrides: {
        src: "used"
      }
    });
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleDrop("kitchen")({
        preventDefault: jest.fn(),
        dataTransfer: { getData: () => "src" }
      } as never);
    });

    expect(params.setImages).toHaveBeenCalledWith(expect.any(Function));

    const updateImages = (params.setImages as jest.Mock).mock
      .calls[0][0] as (value: typeof params.images) => typeof params.images;

    expect(updateImages(params.images).map((image) => ({
      id: image.id,
      category: image.category
    }))).toEqual([
      { id: "dest-1", category: "kitchen" },
      { id: "dest-2", category: "kitchen" },
      { id: "src", category: "kitchen" },
      { id: "other-room", category: "living-room" }
    ]);
  });

  it("preserves a source category as an empty room when its last image is dragged away", async () => {
    const params = buildParams({
      images: [
        {
          id: "src",
          url: "",
          filename: "src.jpg",
          category: "bedroom"
        },
        {
          id: "dest-1",
          url: "",
          filename: "dest-1.jpg",
          category: "kitchen"
        }
      ],
      customCategories: []
    });
    const { result } = renderHook(() => usePlanActions(params));

    await act(async () => {
      await result.current.handleDrop("kitchen")({
        preventDefault: jest.fn(),
        dataTransfer: { getData: () => "src" }
      } as never);
    });

    expect(params.setCustomCategories).toHaveBeenCalledWith(expect.any(Function));

    const updateCategories = (params.setCustomCategories as jest.Mock).mock
      .calls[0][0] as (value: string[]) => string[];

    expect(updateCategories([])).toEqual(["bedroom"]);
    expect(updateCategories(["bedroom"])).toEqual(["bedroom"]);
  });
});
