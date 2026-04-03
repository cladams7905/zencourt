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
} from "@web/src/components/listings/stage/plan/shared";
import { normalizeMotionVariantId } from "@web/src/server/services/videoGeneration/domain/prompt";
import type {
  ListingImageItem,
  WorkspacePlacement
} from "@web/src/components/listings/stage/plan/shared";
import type { CameraMotionVariantId } from "@shared/types/models";
import {
  MULTI_ROOM_CATEGORIES,
  getNextCategoryValue,
  normalizeCategory
} from "@web/src/components/listings/stage/plan/domain/categoryRules";

type UsePlanActionsParams = {
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
      metadata?: ListingImageItem["metadata"];
    }>,
    deletions: string[],
    rollback?: () => void
  ) => Promise<boolean>;
  endDragSession: () => void;
};

export function usePlanActions(params: UsePlanActionsParams) {
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

  const persistSingleImage = React.useCallback(
    async (
      updatedImage: ListingImageItem,
      previousImages: ListingImageItem[],
      previousPlacement: WorkspacePlacement,
      nextPlacement: WorkspacePlacement
    ) => {
      setImages((current) =>
        current.map((image) =>
          image.id === updatedImage.id ? updatedImage : image
        )
      );
      setPlacementOverrides((prev) => ({
        ...prev,
        [updatedImage.id]: nextPlacement
      }));

      const success = await persistImageAssignments(
        [
          {
            id: updatedImage.id,
            category: updatedImage.category ?? null,
            metadata: updatedImage.metadata ?? null
          }
        ],
        [],
        () => {
          setImages(previousImages);
          setPlacementOverrides((prev) => ({
            ...prev,
            [updatedImage.id]: previousPlacement
          }));
        }
      );

      return success;
    },
    [persistImageAssignments, setImages, setPlacementOverrides]
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
      const previousPlacement =
        placementOverrides[imageId] ?? previousImage.workspacePlacement ?? "dock";
      const prevKey = previousImage.category ?? UNCATEGORIZED_CATEGORY_ID;
      if (prevKey === category) {
        const updatedImage = buildImageWithSceneSelection(
          previousImage,
          previousImage.category ?? null,
          false
        );
        await persistSingleImage(
          updatedImage,
          images,
          previousPlacement,
          "dock"
        );
        setDragOverCategory(null);
        return;
      }
      const nextCategory =
        category === UNCATEGORIZED_CATEGORY_ID ? null : category;
      const previousImages = images;
      const updatedImage = buildImageWithSceneSelection(
        previousImage,
        nextCategory,
        false
      );
      const success = await persistSingleImage(
        updatedImage,
        previousImages,
        previousPlacement,
        "dock"
      );
      if (!success) {
        return;
      }
      setDragOverCategory(null);
    },
    [
      buildImageWithSceneSelection,
      images,
      moveImageToDock,
      persistSingleImage,
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
      const updatedImage = buildImageWithSceneSelection(
        previousImage,
        nextCategory,
        true
      );
      void persistSingleImage(
        updatedImage,
        images,
        previousPlacement,
        "used"
      );
      setDragOverCategory(null);
    },
    [
      buildImageWithSceneSelection,
      categoryUsageCounts,
      images,
      placementOverrides,
      persistSingleImage,
      setDragOverCategory,
      setImages,
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
        const previousImage = images.find((image) => image.id === imageId);
        if (!previousImage) {
          return;
        }
        const previousPlacement =
          placementOverrides[imageId] ??
          previousImage.workspacePlacement ??
          "dock";
        const updatedImage = buildImageWithSceneSelection(
          previousImage,
          previousImage.category ?? null,
          false
        );
        await persistSingleImage(
          updatedImage,
          images,
          previousPlacement,
          "dock"
        );
        setDragOverCategory(null);
        return;
      }
      const nextCategory =
        category === UNCATEGORIZED_CATEGORY_ID ? null : category;
      const previousImages = images;
      const previousImage = images.find((image) => image.id === imageId);
      if (!previousImage) {
        return;
      }
      const previousPlacement =
        placementOverrides[imageId] ?? previousImage.workspacePlacement ?? "dock";

      if (
        previousImage.category === nextCategory &&
        previousPlacement === "used"
      ) {
        setDragOverCategory(null);
        return;
      }
      const nextUsedCount =
        (categoryUsageCounts[nextCategory ?? ""] ?? 0) +
        (previousPlacement === "used" && previousImage.category === nextCategory
          ? 0
          : 1);
      if (nextCategory && nextUsedCount > MAX_IMAGES_PER_ROOM) {
        toast.error(
          `This room already has ${MAX_IMAGES_PER_ROOM} photos. Remove one before adding another.`
        );
        setDragOverCategory(null);
        return;
      }
      const updatedImage = buildImageWithSceneSelection(
        previousImage,
        nextCategory,
        true
      );
      await persistSingleImage(
        updatedImage,
        previousImages,
        previousPlacement,
        "used"
      );
      setDragOverCategory(null);
    },
    [
      buildImageWithSceneSelection,
      categoryUsageCounts,
      images,
      moveImageToDock,
      placementOverrides,
      persistSingleImage,
      setDragOverCategory,
      setImages,
      setPlacementOverrides
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
        placementOverrides[imageId] ?? previousImage.workspacePlacement ?? "dock";

      await persistSingleImage(
        updatedImage,
        images,
        previousPlacement,
        previousPlacement
      );
    },
    [buildImageWithSceneSelection, images, persistSingleImage, placementOverrides]
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
