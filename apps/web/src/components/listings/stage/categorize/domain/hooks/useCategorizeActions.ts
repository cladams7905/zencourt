import * as React from "react";
import { toast } from "sonner";
import {
  ROOM_CATEGORIES,
  type RoomCategory
} from "@web/src/lib/domain/listings/image/roomCategories";
import { MAX_IMAGES_PER_ROOM } from "@shared/utils/mediaUpload";
import {
  CATEGORIZE_MAX_USED_PHOTOS,
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
  categoryUsageCounts: Record<string, number>;
  placementOverrides: Record<string, WorkspacePlacement>;
  setImages: React.Dispatch<React.SetStateAction<ListingImageItem[]>>;
  setPlacementOverrides: React.Dispatch<
    React.SetStateAction<Record<string, WorkspacePlacement>>
  >;
  setCustomCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setIsCategoryDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteCategory: React.Dispatch<React.SetStateAction<string | null>>;
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
    categoryUsageCounts,
    placementOverrides,
    setImages,
    setPlacementOverrides,
    setCustomCategories,
    setIsCategoryDialogOpen,
    setDeleteCategory,
    setIsDraggingImage,
    setDragOverCategory,
    persistImageAssignments,
    endDragSession
  } = params;

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

  const handleDropOnCategoryDock = React.useCallback(
    (category: string) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const imageId = event.dataTransfer.getData("text/plain");
      if (!imageId) {
        return;
      }
      const previousImage = images.find((image) => image.id === imageId);
      if (!previousImage) {
        return;
      }
      const imageKey = previousImage.category ?? UNCATEGORIZED_CATEGORY_ID;
      if (imageKey !== category) {
        return;
      }
      moveImageToDock(imageId);
    },
    [images, moveImageToDock]
  );

  /** Drop on a room's unused (whitewashed) lane: dock in that room, reassigning category when needed. */
  const handleDropOnCategoryUnusedStrip = React.useCallback(
    (category: string) => async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const imageId = event.dataTransfer.getData("text/plain");
      if (!imageId) {
        return;
      }
      const previousImage = images.find((image) => image.id === imageId);
      if (!previousImage) {
        return;
      }
      const prevKey = previousImage.category ?? UNCATEGORIZED_CATEGORY_ID;
      if (prevKey === category) {
        moveImageToDock(imageId);
        setDragOverCategory(null);
        return;
      }
      const nextCategory =
        category === UNCATEGORIZED_CATEGORY_ID ? null : category;
      const previousImages = images;
      const previousPlacement =
        placementOverrides[imageId] ??
        previousImage.workspacePlacement ??
        "dock";
      const shouldPersistCategoryChange =
        previousImage.category !== nextCategory;
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
        [imageId]: "dock"
      }));
      if (shouldPersistCategoryChange) {
        setImages(nextImages);
        const success = await persistImageAssignments(
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
        if (!success) {
          return;
        }
      }
      setDragOverCategory(null);
    },
    [
      images,
      moveImageToDock,
      persistImageAssignments,
      placementOverrides,
      setDragOverCategory,
      setImages,
      setPlacementOverrides
    ]
  );

  const handleDropOnRecommendedStrip = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const imageId = event.dataTransfer.getData("text/plain");
      if (!imageId) {
        return;
      }
      const previousImage = images.find((image) => image.id === imageId);
      if (!previousImage) {
        return;
      }
      const nextCategory = previousImage.category;
      if (!nextCategory || nextCategory === "other") {
        toast.error(
          "Assign a room category before adding to recommended photos."
        );
        setDragOverCategory(null);
        return;
      }
      const previousPlacement =
        placementOverrides[imageId] ?? previousImage.workspacePlacement ?? "dock";
      if (previousPlacement === "used") {
        setDragOverCategory(null);
        return;
      }
      const roomUsed = categoryUsageCounts[nextCategory] ?? 0;
      const nextRoomUsed = roomUsed + 1;
      if (nextRoomUsed > MAX_IMAGES_PER_ROOM) {
        toast.error(
          `This room already has ${MAX_IMAGES_PER_ROOM} photos. Remove one before adding another.`
        );
        setDragOverCategory(null);
        return;
      }
      const totalUsed = Object.values(categoryUsageCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      if (totalUsed + 1 > CATEGORIZE_MAX_USED_PHOTOS) {
        toast.error(
          `Reduce the used photo selection to ${CATEGORIZE_MAX_USED_PHOTOS} or fewer before adding more.`
        );
        setDragOverCategory(null);
        return;
      }
      setPlacementOverrides((prev) => ({
        ...prev,
        [imageId]: "used"
      }));
      setDragOverCategory(null);
    },
    [
      categoryUsageCounts,
      images,
      placementOverrides,
      setDragOverCategory,
      setPlacementOverrides
    ]
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
    handleCreateCategory,
    handleEditCategory,
    handleDeleteCategory,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleDropOnCategoryDock,
    handleDropOnCategoryUnusedStrip,
    handleDropOnRecommendedStrip,
    moveImageToDock
  };
}
