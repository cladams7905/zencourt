import { act, renderHook } from "@testing-library/react";
import { useCategorizeActions } from "@web/src/components/listings/categorize/domain/hooks/useCategorizeActions";

const mockToastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

const buildParams = (overrides: Partial<Parameters<typeof useCategorizeActions>[0]> = {}) => {
  const params: Parameters<typeof useCategorizeActions>[0] = {
    images: [
      { id: "img1", url: "", filename: "a.jpg", category: null },
      { id: "img2", url: "", filename: "b.jpg", category: "kitchen" }
    ],
    categoryOrder: ["needs-categorization", "kitchen"],
    categorizedImages: {
      "needs-categorization": [
        { id: "img1", url: "", filename: "a.jpg", category: null }
      ],
      kitchen: [{ id: "img2", url: "", filename: "b.jpg", category: "kitchen" }]
    },
    customCategories: [],
    categoryDialogCategory: null,
    deleteCategory: null,
    moveImageId: "img1",
    deleteImageId: "img1",
    setImages: jest.fn(),
    setCustomCategories: jest.fn(),
    setIsCategoryDialogOpen: jest.fn(),
    setDeleteCategory: jest.fn(),
    setMoveImageId: jest.fn(),
    setDeleteImageId: jest.fn(),
    setIsDraggingImage: jest.fn(),
    setDragOverCategory: jest.fn(),
    persistImageAssignments: jest.fn().mockResolvedValue(true),
    ensurePrimaryForCategory: jest.fn().mockResolvedValue(undefined),
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

  it("prevents duplicate single-room category names", () => {
    const params = buildParams({ categoryOrder: ["needs-categorization", "kitchen"] });
    const { result } = renderHook(() => useCategorizeActions(params));

    act(() => {
      result.current.handleCreateCategory("Kitchen");
    });

    expect(mockToastError).toHaveBeenCalledWith("That room already exists.");
  });

  it("blocks moving images into full categories", async () => {
    const params = buildParams({
      categorizedImages: {
        "needs-categorization": [
          { id: "img1", url: "", filename: "a.jpg", category: null }
        ],
        kitchen: [
          { id: "k1", url: "", filename: "k1.jpg", category: "kitchen" },
          { id: "k2", url: "", filename: "k2.jpg", category: "kitchen" },
          { id: "k3", url: "", filename: "k3.jpg", category: "kitchen" }
        ]
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
    const params = buildParams();
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleDeleteImage();
    });

    expect(params.persistImageAssignments).toHaveBeenCalled();
    expect(params.setDeleteImageId).toHaveBeenCalledWith(null);
  });

  it("renames categories, persists, and ensures primary", async () => {
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
    expect(params.ensurePrimaryForCategory).toHaveBeenCalled();
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

  it("moves image and clears move dialog state on success", async () => {
    const params = buildParams({
      images: [
        { id: "img1", url: "", filename: "a.jpg", category: null },
        { id: "img2", url: "", filename: "b.jpg", category: "kitchen" }
      ],
      moveImageId: "img1"
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleMoveImage("kitchen");
    });

    expect(params.persistImageAssignments).toHaveBeenCalled();
    expect(params.ensurePrimaryForCategory).toHaveBeenCalled();
    expect(params.setMoveImageId).toHaveBeenCalledWith(null);
  });

  it("shows error when setting primary on uncategorized image", async () => {
    const params = buildParams({
      images: [{ id: "img1", url: "", filename: "a.jpg", category: null }]
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleSetPrimaryImage("img1");
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Assign a category before setting a primary photo."
    );
  });

  it("sets primary and persists assignment", async () => {
    const params = buildParams({
      images: [
        { id: "img1", url: "", filename: "a.jpg", category: "kitchen" },
        { id: "img2", url: "", filename: "b.jpg", category: "kitchen" }
      ]
    });
    const { result } = renderHook(() => useCategorizeActions(params));

    await act(async () => {
      await result.current.handleSetPrimaryImage("img2");
    });

    expect(params.persistImageAssignments).toHaveBeenCalled();
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

  it("drop handler clears highlight when dropped onto same category", async () => {
    const params = buildParams({
      images: [{ id: "img1", url: "", filename: "a.jpg", category: "kitchen" }],
      moveImageId: "img1"
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
  });
});
