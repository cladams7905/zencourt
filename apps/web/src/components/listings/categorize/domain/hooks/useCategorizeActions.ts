import * as React from "react";
import { toast } from "sonner";
import { ROOM_CATEGORIES, type RoomCategory } from "@web/src/types/vision";
import { MAX_IMAGES_PER_ROOM } from "@shared/utils/mediaUpload";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/categorize/shared";
import type { ListingImageItem } from "@web/src/components/listings/categorize/shared";
import {
  MULTI_ROOM_CATEGORIES,
  getNextCategoryValue,
  normalizeCategory
} from "@web/src/components/listings/categorize/domain/categoryRules";

type UseCategorizeActionsParams = {
  images: ListingImageItem[];
  categoryOrder: string[];
  categorizedImages: Record<string, ListingImageItem[]>;
  customCategories: string[];
  categoryDialogCategory: string | null;
  deleteCategory: string | null;
  moveImageId: string | null;
  deleteImageId: string | null;
  setImages: React.Dispatch<React.SetStateAction<ListingImageItem[]>>;
  setCustomCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setIsCategoryDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteCategory: React.Dispatch<React.SetStateAction<string | null>>;
  setMoveImageId: React.Dispatch<React.SetStateAction<string | null>>;
  setDeleteImageId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsDraggingImage: React.Dispatch<React.SetStateAction<boolean>>;
  setDragOverCategory: React.Dispatch<React.SetStateAction<string | null>>;
  persistImageAssignments: (
    updates: Array<{ id: string; category: string | null; isPrimary?: boolean }>,
    deletions: string[],
    rollback?: () => void
  ) => Promise<boolean>;
  ensurePrimaryForCategory: (
    category: string | null,
    candidateImages: ListingImageItem[]
  ) => Promise<void>;
  endDragSession: () => void;
};

export function useCategorizeActions(params: UseCategorizeActionsParams) {
  const {
    images,
    categoryOrder,
    categorizedImages,
    customCategories,
    categoryDialogCategory,
    deleteCategory,
    moveImageId,
    deleteImageId,
    setImages,
    setCustomCategories,
    setIsCategoryDialogOpen,
    setDeleteCategory,
    setMoveImageId,
    setDeleteImageId,
    setIsDraggingImage,
    setDragOverCategory,
    persistImageAssignments,
    ensurePrimaryForCategory,
    endDragSession
  } = params;

  const isCategoryAtLimit = React.useCallback(
    (category: string | null) => {
      if (!category || category === UNCATEGORIZED_CATEGORY_ID) {
        return false;
      }
      return (categorizedImages[category]?.length ?? 0) >= MAX_IMAGES_PER_ROOM;
    },
    [categorizedImages]
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
      mode: "create" | "edit",
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
      const createdCategory = resolveCategoryValue(value, "create");
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
          category: updatedCategory,
          isPrimary: image.isPrimary ?? false
        }));
      const success = await persistImageAssignments(updates, [], () => {
        setImages(previousImages);
        setCustomCategories(previousCategories);
      });
      if (!success) {
        return;
      }
      await ensurePrimaryForCategory(updatedCategory, nextImages);
      setIsCategoryDialogOpen(false);
    },
    [
      categoryDialogCategory,
      customCategories,
      ensurePrimaryForCategory,
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
        ? { ...image, category: null, isPrimary: false }
        : image
    );
    const updates = previousImages
      .filter((image) => image.category === categoryToDelete)
      .map((image) => ({
        id: image.id,
        category: null,
        isPrimary: false
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
      if (previousImage?.category === resolvedCategory) {
        setMoveImageId(null);
        return;
      }
      if (
        resolvedCategory &&
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
              category: resolvedCategory,
              isPrimary:
                image.category === resolvedCategory ? image.isPrimary : false
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
            category: updatedImage.category ?? null,
            isPrimary: updatedImage.isPrimary ?? false
          }
        ],
        [],
        () => setImages(previousImages)
      );
      if (!success) {
        return;
      }
      if (previousImage?.category !== updatedImage.category) {
        await ensurePrimaryForCategory(previousImage?.category ?? null, nextImages);
      }
      await ensurePrimaryForCategory(updatedImage.category ?? null, nextImages);
      setMoveImageId(null);
    },
    [
      ensurePrimaryForCategory,
      images,
      isCategoryAtLimit,
      moveImageId,
      persistImageAssignments,
      setImages,
      setMoveImageId
    ]
  );

  const handleSetPrimaryImage = React.useCallback(
    async (imageId: string) => {
      const selected = images.find((image) => image.id === imageId);
      if (!selected || !selected.category) {
        toast.error("Assign a category before setting a primary photo.");
        return;
      }
      const previousImages = images;
      const nextImages = images.map((image) => {
        if (image.category !== selected.category) {
          return image;
        }
        return {
          ...image,
          isPrimary: image.id === imageId
        };
      });
      setImages(nextImages);
      await persistImageAssignments(
        [
          {
            id: selected.id,
            category: selected.category,
            isPrimary: true
          }
        ],
        [],
        () => setImages(previousImages)
      );
    },
    [images, persistImageAssignments, setImages]
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
    if (deletedImage?.category) {
      await ensurePrimaryForCategory(deletedImage.category, remainingImages);
    }
    setDeleteImageId(null);
  }, [
    deleteImageId,
    ensurePrimaryForCategory,
    images,
    persistImageAssignments,
    setDeleteImageId,
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

  const handleDrop = React.useCallback(
    (category: string) => async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const imageId = event.dataTransfer.getData("text/plain");
      if (!imageId) {
        return;
      }
      const nextCategory =
        category === UNCATEGORIZED_CATEGORY_ID ? null : category;
      const previousImages = images;
      const previousImage = images.find((image) => image.id === imageId);
      if (previousImage?.category === nextCategory) {
        setDragOverCategory(null);
        return;
      }
      if (
        nextCategory &&
        previousImage?.category !== nextCategory &&
        isCategoryAtLimit(nextCategory)
      ) {
        toast.error(
          `This room already has ${MAX_IMAGES_PER_ROOM} photos. Remove one before adding another.`
        );
        setDragOverCategory(null);
        return;
      }
      const nextImages = images.map((image) =>
        image.id === imageId
          ? {
              ...image,
              category: nextCategory,
              isPrimary:
                image.category === nextCategory ? image.isPrimary : false
            }
          : image
      );
      const updatedImage = nextImages.find((image) => image.id === imageId);
      if (!updatedImage) {
        return;
      }
      setImages(nextImages);
      await persistImageAssignments(
        [
          {
            id: updatedImage.id,
            category: updatedImage.category ?? null,
            isPrimary: updatedImage.isPrimary ?? false
          }
        ],
        [],
        () => setImages(previousImages)
      );
      if (previousImage?.category !== updatedImage.category) {
        await ensurePrimaryForCategory(previousImage?.category ?? null, nextImages);
      }
      await ensurePrimaryForCategory(updatedImage.category ?? null, nextImages);
      setDragOverCategory(null);
    },
    [
      ensurePrimaryForCategory,
      images,
      isCategoryAtLimit,
      persistImageAssignments,
      setDragOverCategory,
      setImages
    ]
  );

  return {
    activeMoveImage,
    activeDeleteImage,
    handleCreateCategory,
    handleEditCategory,
    handleDeleteCategory,
    handleMoveImage,
    handleSetPrimaryImage,
    handleDeleteImage,
    handleDragStart,
    handleDragEnd,
    handleDrop
  };
}
