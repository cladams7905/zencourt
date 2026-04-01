import * as React from "react";
import { toast } from "sonner";
import {
  ROOM_CATEGORIES,
  type RoomCategory
} from "@web/src/lib/domain/listings/image/roomCategories";
import { MAX_IMAGES_PER_ROOM } from "@shared/utils/mediaUpload";
import {
  UNCATEGORIZED_CATEGORY_ID,
  UNUSED_DOCK_DROP_ZONE_ID
} from "@web/src/components/listings/stage/categorize/shared";
import type {
  ListingImageItem,
  WorkspacePlacement
} from "@web/src/components/listings/stage/categorize/shared";
import {
  MULTI_ROOM_CATEGORIES,
  getNextCategoryValue,
  normalizeCategory
} from "@web/src/components/listings/stage/categorize/domain/categoryRules";

type UseCategorizeActionsParams = {
  images: ListingImageItem[];
  categoryOrder: string[];
  customCategories: string[];
  categoryDialogCategory: string | null;
  deleteCategory: string | null;
  moveImageId: string | null;
  deleteImageId: string | null;
  categoryUsageCounts: Record<string, number>;
  placementOverrides: Record<string, WorkspacePlacement>;
  setImages: React.Dispatch<React.SetStateAction<ListingImageItem[]>>;
  setPlacementOverrides: React.Dispatch<
    React.SetStateAction<Record<string, WorkspacePlacement>>
  >;
  setCustomCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setIsCategoryDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteCategory: React.Dispatch<React.SetStateAction<string | null>>;
  setMoveImageId: React.Dispatch<React.SetStateAction<string | null>>;
  setDeleteImageId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsDraggingImage: React.Dispatch<React.SetStateAction<boolean>>;
  setDragOverCategory: React.Dispatch<React.SetStateAction<string | null>>;
  persistImageAssignments: (
    updates: Array<{
      id: string;
      category: string | null;
    }>,
    deletions: string[],
    rollback?: () => void
  ) => Promise<boolean>;
  endDragSession: () => void;
};

export function useCategorizeActions(params: UseCategorizeActionsParams) {
  const {
    images,
    categoryOrder,
    customCategories,
    categoryDialogCategory,
    deleteCategory,
    moveImageId,
    deleteImageId,
    categoryUsageCounts,
    placementOverrides,
    setImages,
    setPlacementOverrides,
    setCustomCategories,
    setIsCategoryDialogOpen,
    setDeleteCategory,
    setMoveImageId,
    setDeleteImageId,
    setIsDraggingImage,
    setDragOverCategory,
    persistImageAssignments,
    endDragSession
  } = params;

  const isCategoryAtLimit = React.useCallback(
    (category: string | null) => {
      if (!category || category === UNCATEGORIZED_CATEGORY_ID) {
        return false;
      }
      return (categoryUsageCounts[category] ?? 0) >= MAX_IMAGES_PER_ROOM;
    },
    [categoryUsageCounts]
  );

  const activeMoveImage = React.useMemo(
    () => images.find((image) => image.id === moveImageId) ?? null,
    [images, moveImageId]
  );
  const activeDeleteImage = React.useMemo(
    () => images.find((image) => image.id === deleteImageId) ?? null,
    [images, deleteImageId]
  );

  const resolveCategoryValue = React.useCallback(
    (
      input: string,
      mode: "add" | "edit",
      originalCategory?: string | null
    ) => {
      const nextCategory = input.trim();
      if (!nextCategory) {
        return null;
      }
      const normalizedNext = normalizeCategory(nextCategory);
      if (normalizedNext === "other") {
        toast.error("Please choose a specific room category.");
        return null;
      }
      if (mode === "edit" && originalCategory) {
        if (normalizeCategory(originalCategory) === normalizedNext) {
          return originalCategory;
        }
      }
      const existingCategories = categoryOrder.filter(
        (category) => category !== originalCategory
      );
      const existingNormalized = new Set(
        existingCategories.map((category) => normalizeCategory(category))
      );
      const isMultiRoom = MULTI_ROOM_CATEGORIES.has(
        normalizedNext as RoomCategory
      );
      if (!isMultiRoom && existingNormalized.has(normalizedNext)) {
        toast.error("That room already exists.");
        return null;
      }
      if (isMultiRoom) {
        return getNextCategoryValue(normalizedNext, existingCategories);
      }
      return nextCategory;
    },
    [categoryOrder]
  );

  const handleCreateCategory = React.useCallback(
    (value: string) => {
      const createdCategory = resolveCategoryValue(value, "add");
      if (!createdCategory) {
        return;
      }
      setCustomCategories((prev) => {
        if (prev.includes(createdCategory)) {
          return prev;
        }
        return [...prev, createdCategory];
      });
      setIsCategoryDialogOpen(false);
    },
    [resolveCategoryValue, setCustomCategories, setIsCategoryDialogOpen]
  );

  const handleEditCategory = React.useCallback(
    async (value: string) => {
      if (!categoryDialogCategory) {
        return;
      }
      const updatedCategory = resolveCategoryValue(
        value,
        "edit",
        categoryDialogCategory
      );
      if (!updatedCategory) {
        return;
      }
      const originalCategory = categoryDialogCategory;
      if (updatedCategory === originalCategory) {
        setIsCategoryDialogOpen(false);
        return;
      }
      const previousImages = images;
      const previousCategories = customCategories;
      const nextImages = images.map((image) =>
        image.category === originalCategory
          ? { ...image, category: updatedCategory }
          : image
      );
      const nextCategories = (() => {
        const updated = customCategories.filter(
          (category) => category !== originalCategory
        );
        if (
          ROOM_CATEGORIES[updatedCategory as RoomCategory] ||
          updated.includes(updatedCategory)
        ) {
          return updated;
        }
        return [...updated, updatedCategory];
      })();
      setImages(nextImages);
      setCustomCategories(nextCategories);
      const updates = previousImages
        .filter((image) => image.category === originalCategory)
        .map((image) => ({
          id: image.id,
          category: updatedCategory
        }));
      const success = await persistImageAssignments(updates, [], () => {
        setImages(previousImages);
        setCustomCategories(previousCategories);
      });
      if (!success) {
        return;
      }
      setIsCategoryDialogOpen(false);
    },
    [
      categoryDialogCategory,
      customCategories,
      images,
      persistImageAssignments,
      resolveCategoryValue,
      setCustomCategories,
      setImages,
      setIsCategoryDialogOpen
    ]
  );

  const handleDeleteCategory = React.useCallback(async () => {
    if (!deleteCategory) {
      return;
    }
    const categoryToDelete = deleteCategory;
    const previousImages = images;
    const previousCategories = customCategories;
    const nextImages = images.map((image) =>
      image.category === categoryToDelete
        ? { ...image, category: null }
        : image
    );
    const updates = previousImages
      .filter((image) => image.category === categoryToDelete)
      .map((image) => ({
        id: image.id,
        category: null
      }));
    setImages(nextImages);
    setCustomCategories(
      customCategories.filter((category) => category !== categoryToDelete)
    );
    const success = await persistImageAssignments(updates, [], () => {
      setImages(previousImages);
      setCustomCategories(previousCategories);
    });
    if (!success) {
      return;
    }
    setDeleteCategory(null);
  }, [
    customCategories,
    deleteCategory,
    images,
    persistImageAssignments,
    setCustomCategories,
    setDeleteCategory,
    setImages
  ]);

  const handleMoveImage = React.useCallback(
    async (targetCategory: string) => {
      if (!moveImageId) {
        return;
      }
      const resolvedCategory =
        targetCategory === UNCATEGORIZED_CATEGORY_ID ? null : targetCategory;
      const previousImages = images;
      const previousImage = images.find((image) => image.id === moveImageId);
      const previousPlacement =
        placementOverrides[moveImageId] ??
        previousImage?.workspacePlacement ??
        "dock";
      if (previousImage?.category === resolvedCategory) {
        setMoveImageId(null);
        return;
      }
      if (
        resolvedCategory &&
        previousPlacement === "used" &&
        previousImage?.category !== resolvedCategory &&
        isCategoryAtLimit(resolvedCategory)
      ) {
        toast.error(
          `This room already has ${MAX_IMAGES_PER_ROOM} photos. Remove one before adding another.`
        );
        return;
      }
      const nextImages = images.map((image) =>
        image.id === moveImageId
          ? {
              ...image,
              category: resolvedCategory
            }
          : image
      );
      const updatedImage = nextImages.find((image) => image.id === moveImageId);
      if (!updatedImage) {
        return;
      }
      setImages(nextImages);
      const success = await persistImageAssignments(
        [
          {
            id: updatedImage.id,
            category: updatedImage.category ?? null
          }
        ],
        [],
        () => setImages(previousImages)
      );
      if (!success) {
        return;
      }
      setMoveImageId(null);
    },
    [
      images,
      isCategoryAtLimit,
      moveImageId,
      placementOverrides,
      persistImageAssignments,
      setImages,
      setMoveImageId
    ]
  );

  const handleDeleteImage = React.useCallback(async () => {
    if (!deleteImageId) {
      return;
    }
    const imageId = deleteImageId;
    const previousImages = images;
    const deletedImage = images.find((image) => image.id === imageId) ?? null;
    const remainingImages = images.filter((image) => image.id !== imageId);
    setImages(remainingImages);
    const success = await persistImageAssignments([], [imageId], () =>
      setImages(previousImages)
    );
    if (!success) {
      return;
    }
    setPlacementOverrides((prev) => {
      if (!prev[imageId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[imageId];
      return next;
    });
    setDeleteImageId(null);
  }, [
    deleteImageId,
    images,
    persistImageAssignments,
    setDeleteImageId,
    setImages,
    setPlacementOverrides
  ]);

  const handleDragStart = React.useCallback(
    (imageId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData("text/plain", imageId);
      event.dataTransfer.effectAllowed = "move";
      setIsDraggingImage(true);
    },
    [setIsDraggingImage]
  );

  const handleDragEnd = React.useCallback(() => {
    endDragSession();
  }, [endDragSession]);

  const moveImageToDock = React.useCallback(
    (imageId: string) => {
      setPlacementOverrides((prev) => ({
        ...prev,
        [imageId]: "dock"
      }));
      setDragOverCategory(null);
    },
    [setDragOverCategory, setPlacementOverrides]
  );

  const handleDrop = React.useCallback(
    (category: string) => async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const imageId = event.dataTransfer.getData("text/plain");
      if (!imageId) {
        return;
      }
      if (category === UNUSED_DOCK_DROP_ZONE_ID) {
        moveImageToDock(imageId);
        return;
      }
      const nextCategory =
        category === UNCATEGORIZED_CATEGORY_ID ? null : category;
      const previousImages = images;
      const previousImage = images.find((image) => image.id === imageId);
      const previousPlacement =
        placementOverrides[imageId] ?? previousImage?.workspacePlacement ?? "dock";
      const shouldPersistCategoryChange = previousImage?.category !== nextCategory;

      if (
        previousImage?.category === nextCategory &&
        previousPlacement === "used"
      ) {
        setDragOverCategory(null);
        return;
      }
      const nextUsedCount =
        (categoryUsageCounts[nextCategory ?? ""] ?? 0) +
        (previousPlacement === "used" && previousImage?.category === nextCategory
          ? 0
          : 1);
      if (nextCategory && nextUsedCount > MAX_IMAGES_PER_ROOM) {
        toast.error(
          `This room already has ${MAX_IMAGES_PER_ROOM} photos. Remove one before adding another.`
        );
        setDragOverCategory(null);
        return;
      }
      const nextImages = shouldPersistCategoryChange
        ? images.map((image) =>
            image.id === imageId
              ? {
                  ...image,
                  category: nextCategory
                }
              : image
          )
        : images;
      const updatedImage = nextImages.find((image) => image.id === imageId);
      if (!updatedImage) {
        return;
      }
      setPlacementOverrides((prev) => ({
        ...prev,
        [imageId]: "used"
      }));
      if (shouldPersistCategoryChange) {
        setImages(nextImages);
        await persistImageAssignments(
          [
            {
              id: updatedImage.id,
              category: updatedImage.category ?? null
            }
          ],
          [],
          () => {
            setImages(previousImages);
            setPlacementOverrides((prev) => ({
              ...prev,
              [imageId]: previousPlacement
            }));
          }
        );
      }
      setDragOverCategory(null);
    },
    [
      categoryUsageCounts,
      images,
      moveImageToDock,
      placementOverrides,
      persistImageAssignments,
      setDragOverCategory,
      setImages,
      setPlacementOverrides
    ]
  );

  return {
    activeMoveImage,
    activeDeleteImage,
    handleCreateCategory,
    handleEditCategory,
    handleDeleteCategory,
    handleMoveImage,
    handleDeleteImage,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    moveImageToDock
  };
}
