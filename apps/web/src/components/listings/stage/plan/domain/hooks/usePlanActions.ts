import * as React from "react";
import { toast } from "sonner";
import {
  ROOM_CATEGORIES,
  type RoomCategory
} from "@web/src/lib/domain/listings/image/roomCategories";
import {
  UNCATEGORIZED_CATEGORY_ID,
  UNUSED_DOCK_DROP_ZONE_ID
} from "@web/src/components/listings/stage/plan/shared";
import { normalizeMotionVariantId } from "@web/src/lib/domain/videoGeneration/cameraMotionOptions";
import type {
  ListingImageItem,
  WorkspacePlacement
} from "@web/src/components/listings/stage/plan/shared";
import type { CameraMotionVariantId } from "@shared/types/models";
import {
  MULTI_ROOM_CATEGORIES,
  formatCategoryLabel,
  getCategoryBase,
  getNextCategoryValue,
  normalizeCategory
} from "@web/src/components/listings/stage/plan/domain/categoryRules";

type UsePlanActionsParams = {
  images: ListingImageItem[];
  categoryOrder: string[];
  customCategories: string[];
  categoryDialogCategory: string | null;
  deleteCategory: string | null;
  usedImagesByCategory: Record<string, ListingImageItem[]>;
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
  endDragSession: () => void;
};

export function usePlanActions(params: UsePlanActionsParams) {
  const {
    images,
    categoryOrder,
    customCategories,
    categoryDialogCategory,
    deleteCategory,
    usedImagesByCategory,
    placementOverrides,
    setImages,
    setPlacementOverrides,
    setCustomCategories,
    setIsCategoryDialogOpen,
    setDeleteCategory,
    setIsDraggingImage,
    setDragOverCategory,
    endDragSession
  } = params;

  const getCategoryToastLabel = React.useCallback(
    (category: string, extraCategories: string[] = []) => {
      const counts = [...categoryOrder, ...extraCategories].reduce<
        Record<string, number>
      >((acc, value) => {
        const base = getCategoryBase(value);
        acc[base] = (acc[base] ?? 0) + 1;
        return acc;
      }, {});

      return formatCategoryLabel(category, counts);
    },
    [categoryOrder]
  );

  const resolveCategoryValue = React.useCallback(
    (input: string, mode: "add" | "edit", originalCategory?: string | null) => {
      const nextCategory = input.trim();
      if (!nextCategory) {
        return null;
      }
      const normalizedNext = normalizeCategory(nextCategory);
      if (normalizedNext === "other") {
        toast.error("Please choose a specific space category.");
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
        toast.error("That space already exists.");
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
      toast.success(
        `${getCategoryToastLabel(createdCategory, [createdCategory])} added to plan`
      );
      setIsCategoryDialogOpen(false);
    },
    [
      getCategoryToastLabel,
      resolveCategoryValue,
      setCustomCategories,
      setIsCategoryDialogOpen
    ]
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
      setIsCategoryDialogOpen(false);
    },
    [
      categoryDialogCategory,
      customCategories,
      images,
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
    const nextImages = images.map((image) =>
      image.category === categoryToDelete ? { ...image, category: null } : image
    );
    setImages(nextImages);
    setCustomCategories(
      customCategories.filter((category) => category !== categoryToDelete)
    );
    toast.success(
      `${getCategoryToastLabel(categoryToDelete)} removed from plan`
    );
    setDeleteCategory(null);
  }, [
    customCategories,
    deleteCategory,
    getCategoryToastLabel,
    images,
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

  const buildImageWithSceneSelection = React.useCallback(
    (
      image: ListingImageItem,
      nextCategory: string | null,
      selected: boolean,
      motionVariantId?: CameraMotionVariantId
    ): ListingImageItem => {
      const existingMotionVariantId =
        motionVariantId ??
        image.metadata?.videoScene?.motionVariantId ??
        "default";
      const resolvedMotionVariantId = nextCategory
        ? normalizeMotionVariantId(
            nextCategory,
            image.metadata?.perspective,
            existingMotionVariantId
          )
        : existingMotionVariantId;

      return {
        ...image,
        category: nextCategory,
        metadata: {
          width: image.metadata?.width ?? 0,
          height: image.metadata?.height ?? 0,
          format: image.metadata?.format ?? "unknown",
          size: image.metadata?.size ?? 0,
          lastModified: image.metadata?.lastModified ?? 0,
          ...image.metadata,
          videoScene: {
            selected,
            motionVariantId: resolvedMotionVariantId
          }
        }
      };
    },
    []
  );

  const updateSingleImageLocally = React.useCallback(
    (
      updatedImage: ListingImageItem,
      nextPlacement: WorkspacePlacement,
      preservedUsedCategory?: string | null,
      emptiedCategory?: string | null,
      appendToCategoryEnd?: boolean
    ) => {
      setImages((current) => {
        const nextImages = current.map((image) =>
          image.id === updatedImage.id ? updatedImage : image
        );

        if (!appendToCategoryEnd || !updatedImage.category) {
          return nextImages;
        }

        const reordered = nextImages.filter(
          (image) => image.id !== updatedImage.id
        );
        const destinationIndexes = reordered.reduce<number[]>(
          (acc, image, index) => {
            if (image.category === updatedImage.category) {
              acc.push(index);
            }
            return acc;
          },
          []
        );

        if (destinationIndexes.length === 0) {
          return [...reordered, updatedImage];
        }

        const insertAt = destinationIndexes[destinationIndexes.length - 1] + 1;
        reordered.splice(insertAt, 0, updatedImage);
        return reordered;
      });
      if (emptiedCategory) {
        setCustomCategories((prev) => {
          if (prev.includes(emptiedCategory)) {
            return prev;
          }
          return [...prev, emptiedCategory];
        });
      }
      setPlacementOverrides((prev) => ({
        ...prev,
        ...(preservedUsedCategory
          ? Object.fromEntries(
              (usedImagesByCategory[preservedUsedCategory] ?? [])
                .filter((image) => image.id !== updatedImage.id)
                .map((image) => [image.id, "used" as const])
            )
          : {}),
        [updatedImage.id]: nextPlacement
      }));
    },
    [
      setCustomCategories,
      setImages,
      setPlacementOverrides,
      usedImagesByCategory
    ]
  );

  const resolveEmptiedSourceCategory = React.useCallback(
    (previousImage: ListingImageItem, nextCategory: string | null) => {
      const sourceCategory = previousImage.category;
      if (
        !sourceCategory ||
        sourceCategory === nextCategory ||
        sourceCategory === "other"
      ) {
        return null;
      }

      const remainingImagesInSourceCategory = images.filter(
        (image) =>
          image.id !== previousImage.id && image.category === sourceCategory
      ).length;

      return remainingImagesInSourceCategory === 0 ? sourceCategory : null;
    },
    [images]
  );

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
        const updatedImage = buildImageWithSceneSelection(
          previousImage,
          previousImage.category ?? null,
          false
        );
        updateSingleImageLocally(updatedImage, "dock");
        setDragOverCategory(null);
        return;
      }
      const nextCategory =
        category === UNCATEGORIZED_CATEGORY_ID ? null : category;
      const updatedImage = buildImageWithSceneSelection(
        previousImage,
        nextCategory,
        false
      );
      const emptiedCategory = resolveEmptiedSourceCategory(
        previousImage,
        nextCategory
      );
      updateSingleImageLocally(
        updatedImage,
        "dock",
        undefined,
        emptiedCategory,
        previousImage.category !== nextCategory
      );
      setDragOverCategory(null);
    },
    [
      buildImageWithSceneSelection,
      images,
      resolveEmptiedSourceCategory,
      setDragOverCategory,
      updateSingleImageLocally
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
        placementOverrides[imageId] ??
        previousImage.workspacePlacement ??
        "dock";
      if (previousPlacement === "used") {
        setDragOverCategory(null);
        return;
      }
      const updatedImage = buildImageWithSceneSelection(
        previousImage,
        nextCategory,
        true
      );
      const emptiedCategory = resolveEmptiedSourceCategory(
        previousImage,
        nextCategory
      );
      updateSingleImageLocally(
        updatedImage,
        "used",
        nextCategory,
        emptiedCategory,
        false
      );
      setDragOverCategory(null);
    },
    [
      buildImageWithSceneSelection,
      images,
      placementOverrides,
      resolveEmptiedSourceCategory,
      setDragOverCategory,
      updateSingleImageLocally
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
        const previousImage = images.find((image) => image.id === imageId);
        if (!previousImage) {
          return;
        }
        const updatedImage = buildImageWithSceneSelection(
          previousImage,
          previousImage.category ?? null,
          false
        );
        updateSingleImageLocally(updatedImage, "dock");
        setDragOverCategory(null);
        return;
      }
      const nextCategory =
        category === UNCATEGORIZED_CATEGORY_ID ? null : category;
      const previousImage = images.find((image) => image.id === imageId);
      if (!previousImage) {
        return;
      }
      const previousPlacement =
        placementOverrides[imageId] ??
        previousImage.workspacePlacement ??
        "dock";

      if (
        previousImage.category === nextCategory &&
        previousPlacement === "used"
      ) {
        setDragOverCategory(null);
        return;
      }
      const updatedImage = buildImageWithSceneSelection(
        previousImage,
        nextCategory,
        true
      );
      const emptiedCategory = resolveEmptiedSourceCategory(
        previousImage,
        nextCategory
      );
      updateSingleImageLocally(
        updatedImage,
        "used",
        nextCategory,
        emptiedCategory,
        previousImage.category !== nextCategory
      );
      setDragOverCategory(null);
    },
    [
      buildImageWithSceneSelection,
      images,
      placementOverrides,
      resolveEmptiedSourceCategory,
      setDragOverCategory,
      updateSingleImageLocally
    ]
  );

  const handleSceneMotionChange = React.useCallback(
    async (imageId: string, motionVariantId: CameraMotionVariantId) => {
      const previousImage = images.find((image) => image.id === imageId);
      if (!previousImage) {
        return;
      }

      const updatedImage = buildImageWithSceneSelection(
        previousImage,
        previousImage.category ?? null,
        previousImage.workspacePlacement === "used",
        motionVariantId
      );
      const previousPlacement =
        placementOverrides[imageId] ??
        previousImage.workspacePlacement ??
        "dock";

      updateSingleImageLocally(updatedImage, previousPlacement);
    },
    [
      buildImageWithSceneSelection,
      images,
      placementOverrides,
      updateSingleImageLocally
    ]
  );

  return {
    handleCreateCategory,
    handleEditCategory,
    handleDeleteCategory,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleSceneMotionChange,
    handleDropOnCategoryDock,
    handleDropOnCategoryUnusedStrip,
    handleDropOnRecommendedStrip,
    moveImageToDock
  };
}
