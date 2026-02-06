"use client";

import * as React from "react";
import { ListingViewHeader } from "../ListingViewHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "../../ui/accordion";
import { Button } from "../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { AddressAutocomplete } from "../../location/AddressAutocomplete";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../../ui/dropdown-menu";
import {
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Move,
  Pencil,
  Plus,
  Star,
  Trash2,
  Upload
} from "lucide-react";
import { LoadingImage } from "../../ui/loading-image";
import { UploadDialog } from "../../uploads/UploadDialog";
import {
  IMAGE_UPLOAD_LIMIT,
  MAX_CATEGORIES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_ROOM
} from "@shared/utils/mediaUpload";
import { toast } from "sonner";
import {
  createListingImageRecords,
  deleteListingImageUploads,
  getListingImageUploadUrls,
  assignPrimaryListingImageForCategory,
  updateListing,
  updateListingImageAssignments
} from "@web/src/server/actions/db/listings";
import { ROOM_CATEGORIES, type RoomCategory } from "@web/src/types/vision";
import { useRouter } from "next/navigation";
import { ListingCategoryDialog } from "./ListingCategoryDialog";
import { ListingCategoryDeleteDialog } from "./ListingCategoryDeleteDialog";
import { ListingImageMoveDialog } from "./ListingImageMoveDialog";
import { ListingImageDeleteDialog } from "./ListingImageDeleteDialog";
import { getImageMetadataFromFile } from "@web/src/lib/imageMetadata";
import { ListingTimeline } from "../ListingTimeline";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";

type ListingImageItem = {
  id: string;
  url: string;
  filename: string;
  category: string | null;
  isPrimary?: boolean | null;
  primaryScore?: number | null;
};

interface ListingCategorizeViewProps {
  title: string;
  initialAddress: string;
  listingId: string;
  userId: string;
  initialImages: ListingImageItem[];
  googleMapsApiKey: string;
  hasPropertyDetails: boolean;
}

const timelineSteps = [
  { label: "Categorize", active: true, completed: false },
  { label: "Review", active: false, completed: false },
  { label: "Create", active: false, completed: false }
];

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const normalizeCategory = (value: string) => value.trim().toLowerCase();
const MULTI_ROOM_CATEGORIES = new Set(
  Object.values(ROOM_CATEGORIES)
    .filter((category) => category.allowNumbering)
    .map((category) => category.id)
);

const getScrollParent = (el: HTMLElement): HTMLElement => {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return document.documentElement;
};

const getCategoryBase = (category: string) => category.replace(/-\d+$/, "");

const formatCategoryLabel = (
  category: string,
  baseCounts: Record<string, number>
) => {
  if (category === "needs-categorization") {
    return "Uncategorized";
  }
  const baseCategory = getCategoryBase(category);
  const metadata = ROOM_CATEGORIES[baseCategory as RoomCategory];
  const baseLabel =
    metadata?.label ??
    baseCategory
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  const match = category.match(/-(\d+)$/);
  const roomNumber = match ? Number(match[1]) : 1;
  const shouldNumber =
    metadata?.allowNumbering && (baseCounts[baseCategory] ?? 0) > 1;

  if (shouldNumber) {
    return `${baseLabel} ${roomNumber}`;
  }

  return baseLabel;
};

const getNextCategoryValue = (base: string, existing: string[]) => {
  const normalizedBase = normalizeCategory(base);
  let maxIndex = 0;

  existing.forEach((category) => {
    const normalized = normalizeCategory(category);
    if (normalized === normalizedBase) {
      maxIndex = Math.max(maxIndex, 1);
      return;
    }
    if (normalized.startsWith(`${normalizedBase}-`)) {
      const suffix = normalized.slice(normalizedBase.length + 1);
      const numberValue = Number(suffix);
      if (Number.isInteger(numberValue) && numberValue > 0) {
        maxIndex = Math.max(maxIndex, numberValue);
      }
    }
  });

  if (maxIndex === 0) {
    return normalizedBase;
  }

  return `${normalizedBase}-${maxIndex + 1}`;
};

export function ListingCategorizeView({
  title,
  initialAddress,
  listingId,
  userId,
  initialImages,
  googleMapsApiKey,
  hasPropertyDetails
}: ListingCategorizeViewProps) {
  const router = useRouter();
  const [draftTitle, setDraftTitle] = React.useState(title);
  const [images, setImages] = React.useState<ListingImageItem[]>(initialImages);
  const [dragOverCategory, setDragOverCategory] = React.useState<string | null>(
    null
  );
  const [addressValue, setAddressValue] = React.useState(initialAddress);
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = React.useState<
    "create" | "edit"
  >("create");
  const [categoryDialogCategory, setCategoryDialogCategory] = React.useState<
    string | null
  >(null);
  const [deleteCategory, setDeleteCategory] = React.useState<string | null>(
    null
  );
  const [moveImageId, setMoveImageId] = React.useState<string | null>(null);
  const [deleteImageId, setDeleteImageId] = React.useState<string | null>(null);
  const [openImageMenuId, setOpenImageMenuId] = React.useState<string | null>(
    null
  );
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);
  const [savingCount, setSavingCount] = React.useState(0);
  const [isDraggingImage, setIsDraggingImage] = React.useState(false);
  const [hasPropertyDetailsState, setHasPropertyDetailsState] =
    React.useState(hasPropertyDetails);
  const lastDragClientYRef = React.useRef<number | null>(null);
  const headerRef = React.useRef<HTMLElement | null>(null);
  const draftTitleRef = React.useRef(title);
  const lastSavedAddressRef = React.useRef(initialAddress.trim());

  React.useEffect(() => {
    draftTitleRef.current = draftTitle;
  }, [draftTitle]);

  React.useEffect(() => {
    emitListingSidebarUpdate({
      id: listingId,
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  const categorizedImages = React.useMemo(
    () =>
      images.reduce<Record<string, ListingImageItem[]>>((acc, image) => {
        const key = image.category ?? "needs-categorization";
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(image);
        return acc;
      }, {}),
    [images]
  );

  const categoryOrder = React.useMemo(() => {
    const keys = new Set([
      ...Object.keys(categorizedImages),
      ...customCategories
    ]);
    const sorted = Array.from(keys).sort((a, b) => {
      if (a === "needs-categorization") return -1;
      if (b === "needs-categorization") return 1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [categorizedImages, customCategories]);
  const [openCategories, setOpenCategories] = React.useState<string[]>(
    () => categoryOrder
  );
  const baseCategoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    categoryOrder.forEach((category) => {
      if (category === "needs-categorization") {
        return;
      }
      const base = getCategoryBase(category);
      counts[base] = (counts[base] ?? 0) + 1;
    });
    return counts;
  }, [categoryOrder]);

  React.useEffect(() => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      categoryOrder.forEach((category) => next.add(category));
      return Array.from(next);
    });
  }, [categoryOrder]);

  React.useEffect(() => {
    if (!isDraggingImage) {
      return;
    }
    const scrollContainer = headerRef.current
      ? getScrollParent(headerRef.current)
      : null;
    let rafId: number | null = null;
    const handleDragOver = (event: DragEvent) => {
      lastDragClientYRef.current = event.clientY;
    };
    const tick = () => {
      const clientY = lastDragClientYRef.current;
      if (clientY !== null && scrollContainer) {
        const threshold = 200;
        const topThreshold = 250;
        const viewportHeight = window.innerHeight;
        const headerBottom =
          headerRef.current?.getBoundingClientRect().bottom ?? 0;
        let scrollDelta = 0;
        if (clientY < headerBottom + topThreshold) {
          const intensity =
            (headerBottom + topThreshold - clientY) / topThreshold;
          scrollDelta = -Math.ceil(3 + intensity * 12);
        } else if (clientY > viewportHeight - threshold) {
          const intensity =
            (clientY - (viewportHeight - threshold)) / threshold;
          scrollDelta = Math.ceil(3 + intensity * 10);
        }
        if (scrollDelta !== 0) {
          scrollContainer.scrollBy({ top: scrollDelta, behavior: "auto" });
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };
    window.addEventListener("dragover", handleDragOver);
    const handleDragEnd = () => {
      setIsDraggingImage(false);
      setDragOverCategory(null);
    };
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("drop", handleDragEnd);
    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDragEnd);
      lastDragClientYRef.current = null;
    };
  }, [isDraggingImage]);
  const hasUncategorized = images.some((image) => !image.category);
  const hasEmptyCategory = categoryOrder.some(
    (category) => (categorizedImages[category]?.length ?? 0) === 0
  );
  const activeCategoryCount = categoryOrder.filter(
    (category) => category !== "needs-categorization"
  ).length;
  const hasTooManyCategories = activeCategoryCount > MAX_CATEGORIES;
  const hasOverLimit = categoryOrder.some((category) => {
    if (category === "needs-categorization") {
      return false;
    }
    return (categorizedImages[category]?.length ?? 0) > MAX_IMAGES_PER_ROOM;
  });
  const needsAddress = addressValue.trim() === "";
  const canContinue =
    !hasUncategorized &&
    !hasEmptyCategory &&
    !needsAddress &&
    !hasOverLimit &&
    !hasTooManyCategories;
  const isSavingDraft = savingCount > 0;
  const existingFileNames = React.useMemo(() => {
    return new Set(images.map((image) => image.filename.toLowerCase()));
  }, [images]);
  const moveCategoryOptions = React.useMemo(() => {
    return categoryOrder.map((category) => {
      const count = categorizedImages[category]?.length ?? 0;
      const isLimited = category !== "needs-categorization";
      const isFull = isLimited && count >= MAX_IMAGES_PER_ROOM;
      return {
        value: category,
        label:
          category === "needs-categorization"
            ? "Uncategorized"
            : `${formatCategoryLabel(category, baseCategoryCounts)}${
                isFull ? " (full)" : ""
              }`
      };
    });
  }, [baseCategoryCounts, categorizedImages, categoryOrder]);

  const runDraftSave = React.useCallback(async <T,>(fn: () => Promise<T>) => {
    setSavingCount((prev) => prev + 1);
    try {
      return await fn();
    } finally {
      setSavingCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const persistImageAssignments = React.useCallback(
    async (
      updates: Array<{
        id: string;
        category: string | null;
        isPrimary?: boolean;
      }>,
      deletions: string[],
      rollback?: () => void
    ) => {
      try {
        await runDraftSave(() =>
          updateListingImageAssignments(userId, listingId, updates, deletions)
        );
        return true;
      } catch (error) {
        rollback?.();
        toast.error(
          (error as Error).message || "Failed to update listing images."
        );
        return false;
      }
    },
    [listingId, runDraftSave, userId]
  );

  React.useEffect(() => {
    const overflowIds = new Set<string>();
    const categoriesToToast: string[] = [];
    let didExceedCategoryLimit = false;

    const activeCategories = categoryOrder.filter(
      (category) => category !== "needs-categorization"
    );
    if (activeCategories.length > MAX_CATEGORIES) {
      const allowedCategories = new Set(
        activeCategories.slice(0, MAX_CATEGORIES)
      );
      activeCategories.forEach((category) => {
        if (allowedCategories.has(category)) {
          return;
        }
        const categoryImages = images.filter(
          (image) => image.category === category
        );
        categoryImages.forEach((image) => overflowIds.add(image.id));
      });
      didExceedCategoryLimit = true;
    }

    categoryOrder.forEach((category) => {
      if (category === "needs-categorization") {
        return;
      }
      const categoryImages = images.filter(
        (image) => image.category === category
      );
      if (categoryImages.length <= MAX_IMAGES_PER_ROOM) {
        return;
      }
      const sorted = [...categoryImages].sort((a, b) => {
        const scoreA = a.primaryScore ?? -1;
        const scoreB = b.primaryScore ?? -1;
        return scoreB - scoreA;
      });
      const keepIds = new Set(
        sorted.slice(0, MAX_IMAGES_PER_ROOM).map((image) => image.id)
      );
      categoryImages.forEach((image) => {
        if (!keepIds.has(image.id)) {
          overflowIds.add(image.id);
        }
      });
      categoriesToToast.push(category);
    });

    if (overflowIds.size === 0) {
      return;
    }

    const previousImages = images;
    const updates = Array.from(overflowIds).map((id) => ({
      id,
      category: null,
      isPrimary: false
    }));
    const nextImages = images.map((image) =>
      overflowIds.has(image.id)
        ? { ...image, category: null, isPrimary: false }
        : image
    );

    setImages(nextImages);
    void persistImageAssignments(updates, [], () => setImages(previousImages));
    if (didExceedCategoryLimit) {
      toast.error(
        `This listing exceeds the maximum of ${MAX_CATEGORIES} categories. Extra images were moved to Uncategorized.`
      );
    }
    categoriesToToast.forEach((category) => {
      toast.error(
        `Too many images in ${formatCategoryLabel(
          category,
          baseCategoryCounts
        )}. Please recategorize or remove them.`
      );
    });
  }, [baseCategoryCounts, categoryOrder, images, persistImageAssignments]);

  const persistListingTitle = React.useCallback(
    async (nextTitle: string) => {
      const previous = draftTitleRef.current;
      setDraftTitle(nextTitle);
      try {
        await runDraftSave(() =>
          updateListing(userId, listingId, { title: nextTitle })
        );
        emitListingSidebarUpdate({
          id: listingId,
          title: nextTitle,
          lastOpenedAt: new Date().toISOString()
        });
        return true;
      } catch (error) {
        setDraftTitle(previous);
        toast.error(
          (error as Error).message || "Failed to update listing name."
        );
        return false;
      }
    },
    [listingId, runDraftSave, userId]
  );

  const isCategoryAtLimit = React.useCallback(
    (category: string | null) => {
      if (!category || category === "needs-categorization") {
        return false;
      }
      return (categorizedImages[category]?.length ?? 0) >= MAX_IMAGES_PER_ROOM;
    },
    [categorizedImages]
  );

  const ensurePrimaryForCategory = React.useCallback(
    async (category: string | null, candidateImages: ListingImageItem[]) => {
      if (!category) {
        return;
      }
      const categoryImages = candidateImages.filter(
        (image) => image.category === category
      );
      if (categoryImages.length === 0) {
        return;
      }
      const hasPrimary = categoryImages.some((image) => image.isPrimary);
      if (hasPrimary) {
        return;
      }
      try {
        const { primaryImageId } = await runDraftSave(() =>
          assignPrimaryListingImageForCategory(userId, listingId, category)
        );
        if (primaryImageId) {
          setImages((prev) =>
            prev.map((image) =>
              image.category === category
                ? { ...image, isPrimary: image.id === primaryImageId }
                : image
            )
          );
        }
      } catch (error) {
        toast.error(
          (error as Error).message || "Failed to update primary image."
        );
      }
    },
    [listingId, runDraftSave, userId]
  );
  const activeMoveImage = React.useMemo(
    () => images.find((image) => image.id === moveImageId) ?? null,
    [images, moveImageId]
  );
  const activeDeleteImage = React.useMemo(
    () => images.find((image) => image.id === deleteImageId) ?? null,
    [images, deleteImageId]
  );

  const resolveCategoryValue = (
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
  };

  const handleCreateCategory = (value: string) => {
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
  };

  const handleEditCategory = async (value: string) => {
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
  };

  const handleDeleteCategory = async () => {
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
  };

  const handleMoveImage = async (targetCategory: string) => {
    if (!moveImageId) {
      return;
    }
    const resolvedCategory =
      targetCategory === "needs-categorization" ? null : targetCategory;
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
      await ensurePrimaryForCategory(
        previousImage?.category ?? null,
        nextImages
      );
    }
    await ensurePrimaryForCategory(updatedImage.category ?? null, nextImages);
    setMoveImageId(null);
  };

  const handleSetPrimaryImage = async (imageId: string) => {
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
  };

  const handleDeleteImage = async () => {
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
  };

  const handleContinue = async () => {
    const nextAddress = addressValue.trim();
    if (nextAddress) {
      const previousAddress = lastSavedAddressRef.current;
      const shouldClearDetails =
        nextAddress !== previousAddress && nextAddress.length > 0;
      try {
        await runDraftSave(() =>
          updateListing(userId, listingId, {
            address: nextAddress,
            propertyDetails: shouldClearDetails ? null : undefined,
            propertyDetailsSource: shouldClearDetails ? null : undefined,
            propertyDetailsFetchedAt: shouldClearDetails ? null : undefined,
            propertyDetailsRevision: shouldClearDetails ? null : undefined
          })
        );
        lastSavedAddressRef.current = nextAddress;
        if (shouldClearDetails) {
          setHasPropertyDetailsState(false);
        }
      } catch (error) {
        toast.error(
          (error as Error).message || "Failed to save listing address."
        );
        return;
      }
    }

    if (hasPropertyDetailsState) {
      router.push(`/listings/${listingId}/review`);
      return;
    }

    router.push(`/listings/${listingId}/review/processing`);
  };

  const handleDragStart =
    (imageId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData("text/plain", imageId);
      event.dataTransfer.effectAllowed = "move";
      setIsDraggingImage(true);
    };

  const handleDragEnd = () => {
    setIsDraggingImage(false);
    setDragOverCategory(null);
  };

  const handleDrop =
    (category: string) => async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const imageId = event.dataTransfer.getData("text/plain");
      if (!imageId) {
        return;
      }
      const nextCategory =
        category === "needs-categorization" ? null : category;
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
        await ensurePrimaryForCategory(
          previousImage?.category ?? null,
          nextImages
        );
      }
      await ensurePrimaryForCategory(updatedImage.category ?? null, nextImages);
      setDragOverCategory(null);
    };

  return (
    <>
      <ListingViewHeader
        ref={headerRef}
        title={draftTitle}
        timeline={<ListingTimeline steps={timelineSteps} className="mb-0" />}
        action={
          isSavingDraft ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </div>
          ) : null
        }
      />
      <div
        className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-10"
        onDragOver={(event) => {
          lastDragClientYRef.current = event.clientY;
        }}
      >
        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="flex-1">
            <div className="flex w-full gap-8">
              <div className="flex flex- w-full items-center gap-3">
                <h2 className="text-xl font-header text-foreground">
                  Categorize Listing photos
                </h2>
                <div className="ml-auto flex items-center gap-2 flex-nowrap">
                  <span className="text-xs text-muted-foreground mr-[9px] font-medium">
                    {images.length}/{IMAGE_UPLOAD_LIMIT} photos
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => setIsUploadOpen(true)}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Upload more listing photos
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => {
                          setCategoryDialogMode("create");
                          setCategoryDialogCategory(null);
                          setIsCategoryDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Add a room category
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            {images.length === 0 ? (
              <div className="mt-6 rounded-lg border border-border bg-secondary p-6 text-sm text-muted-foreground">
                No images uploaded yet.
              </div>
            ) : (
              <Accordion
                type="multiple"
                value={openCategories}
                onValueChange={setOpenCategories}
                className="mt-6 space-y-4"
              >
                {categoryOrder.map((category) => (
                  <AccordionItem
                    key={category}
                    value={category}
                    className={`border px-4 ${
                      category === "needs-categorization"
                        ? "border-destructive/20 bg-destructive/10 text-destructive"
                        : "border-border bg-card"
                    }`}
                  >
                    <AccordionTrigger
                      className={`py-4 ${
                        category === "needs-categorization"
                          ? "text-destructive"
                          : ""
                      }`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setOpenCategories((prev) =>
                          prev.includes(category) ? prev : [...prev, category]
                        );
                        if (dragOverCategory !== category) {
                          setDragOverCategory(category);
                        }
                      }}
                    >
                      <div className="flex w-full items-center justify-between gap-4">
                        <div
                          className={`flex items-center gap-2 text-sm ${
                            category === "needs-categorization"
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          {formatCategoryLabel(category, baseCategoryCounts)}
                        </div>
                        <div className="flex items-center gap-4">
                          {(() => {
                            const count =
                              categorizedImages[category]?.length ?? 0;
                            return (
                              <span
                                className={`text-xs ${
                                  category === "needs-categorization"
                                    ? "text-destructive/80"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {category === "needs-categorization"
                                  ? `${count} photo${count === 1 ? "" : "s"}`
                                  : `${count}/${MAX_IMAGES_PER_ROOM} photos`}
                              </span>
                            );
                          })()}
                          {category !== "needs-categorization" ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className="flex items-center justify-center rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                                  aria-label="Category settings"
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                    }
                                    event.stopPropagation();
                                  }}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={8}>
                                <DropdownMenuItem
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    setCategoryDialogMode("edit");
                                    setCategoryDialogCategory(category);
                                    setIsCategoryDialogOpen(true);
                                  }}
                                >
                                  <Pencil size={12} />
                                  Rename category
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1.5 bg-border/50" />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    setDeleteCategory(category);
                                  }}
                                >
                                  <Trash2 size={12} />
                                  Delete category
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <div className="h-6 w-6" />
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div
                        className={`rounded-lg border border-dashed px-3 py-3 transition-colors ${
                          category === "needs-categorization"
                            ? dragOverCategory === category
                              ? "border-destructive/60 bg-destructive/10"
                              : "border-destructive/30"
                            : dragOverCategory === category
                              ? "border-foreground/40 bg-secondary"
                              : "border-border"
                        }`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (dragOverCategory !== category) {
                            setDragOverCategory(category);
                          }
                        }}
                        onDragLeave={(event) => {
                          if (
                            !event.currentTarget.contains(
                              event.relatedTarget as Node | null
                            )
                          ) {
                            setDragOverCategory(null);
                          }
                        }}
                        onDrop={handleDrop(category)}
                      >
                        {categorizedImages[category]?.length ? (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {[...categorizedImages[category]]
                              .sort((a, b) => {
                                const primaryA = a.isPrimary ? 1 : 0;
                                const primaryB = b.isPrimary ? 1 : 0;
                                return primaryB - primaryA;
                              })
                              .map((image) => (
                                <div
                                  key={image.id}
                                  className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary/40 cursor-grab"
                                  draggable
                                  onDragStart={handleDragStart(image.id)}
                                  onDragEnd={handleDragEnd}
                                >
                                  {image.isPrimary ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-primary/40 text-primary-foreground backdrop-blur-lg">
                                          <Star className="h-4 w-4" />
                                          <span className="sr-only">
                                            Primary
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent sideOffset={6}>
                                        Primary image — used as the starting{" "}
                                        <br />
                                        frame for video generation.
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                  <div
                                    className={`absolute top-2 right-2 z-10 transition-opacity ${
                                      openImageMenuId === image.id
                                        ? "opacity-100"
                                        : "opacity-0 group-hover:opacity-100"
                                    }`}
                                  >
                                    <DropdownMenu
                                      open={openImageMenuId === image.id}
                                      onOpenChange={(open) =>
                                        setOpenImageMenuId(
                                          open ? image.id : null
                                        )
                                      }
                                    >
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background"
                                          aria-label="Photo options"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        sideOffset={8}
                                      >
                                        <DropdownMenuItem
                                          disabled={
                                            !image.category ||
                                            image.isPrimary ||
                                            undefined
                                          }
                                          onSelect={(event) => {
                                            event.preventDefault();
                                            handleSetPrimaryImage(image.id);
                                          }}
                                        >
                                          <Star size={12} />
                                          {image.isPrimary
                                            ? "Primary photo"
                                            : "Set as primary"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onSelect={(event) => {
                                            event.preventDefault();
                                            setMoveImageId(image.id);
                                          }}
                                        >
                                          <Move size={12} />
                                          Move to category
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1.5 bg-border/50" />
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onSelect={(event) => {
                                            event.preventDefault();
                                            setDeleteImageId(image.id);
                                          }}
                                        >
                                          <Trash2 size={12} />
                                          Delete photo
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  <LoadingImage
                                    src={image.url}
                                    alt={image.filename}
                                    className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                                    fill
                                  />
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                            Drag photos here to add to this category.
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </section>

          <aside className="w-full lg:w-72 mt-14">
            <div className="sticky top-[124px] space-y-4">
              <div className="rounded-lg border border-border bg-secondary px-4 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg text-foreground">Listing details</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add the listing address now so we can begin tailoring the
                  campaign.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm text-foreground">
                      Listing address
                    </label>
                    <AddressAutocomplete
                      placeholder="123 Market Street, Seattle WA"
                      value={addressValue}
                      onChange={setAddressValue}
                      onSelectAddress={(selection) => {
                        const nextTitle =
                          selection.formattedAddress?.split(",")[0]?.trim() ||
                          "";
                        if (nextTitle) {
                          void persistListingTitle(nextTitle);
                        }
                        if (selection.formattedAddress) {
                          const nextAddress = selection.formattedAddress.trim();
                          const previousAddress = lastSavedAddressRef.current;
                          const shouldClearDetails =
                            nextAddress !== previousAddress &&
                            nextAddress.length > 0;
                          setAddressValue(nextAddress);
                          void runDraftSave(() =>
                            updateListing(userId, listingId, {
                              address: nextAddress,
                              propertyDetails: shouldClearDetails
                                ? null
                                : undefined,
                              propertyDetailsSource: shouldClearDetails
                                ? null
                                : undefined,
                              propertyDetailsFetchedAt: shouldClearDetails
                                ? null
                                : undefined,
                              propertyDetailsRevision: shouldClearDetails
                                ? null
                                : undefined
                            })
                          )
                            .then(() => {
                              lastSavedAddressRef.current = nextAddress;
                              if (shouldClearDetails) {
                                setHasPropertyDetailsState(false);
                              }
                            })
                            .catch((error) => {
                              toast.error(
                                (error as Error).message ||
                                  "Failed to update listing address."
                              );
                            });
                        }
                      }}
                      apiKey={googleMapsApiKey}
                    />
                  </div>
                </div>
                <div className="gap-4 space-y-4">
                  {hasUncategorized ||
                  hasEmptyCategory ||
                  needsAddress ||
                  hasOverLimit ||
                  hasTooManyCategories ? (
                    <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                      <p className="text-[11px] font-semibold uppercase tracking-wide">
                        Required fixes
                      </p>
                      <ul className="mt-2 space-y-2 text-destructive">
                        {hasUncategorized ? (
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                            <span>One or more images are uncategorized.</span>
                          </li>
                        ) : null}
                        {hasEmptyCategory ? (
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                            <span>One or more room categories are empty.</span>
                          </li>
                        ) : null}
                        {hasTooManyCategories ? (
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                            <span>
                              Limit categories to {MAX_CATEGORIES} per listing.
                            </span>
                          </li>
                        ) : null}
                        {hasOverLimit ? (
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                            <span>
                              One or more room categories have more than{" "}
                              {MAX_IMAGES_PER_ROOM} photos.
                            </span>
                          </li>
                        ) : null}
                        {needsAddress ? (
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                            <span>Listing address is not filled in.</span>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className="h-px my-4 w-full bg-border/60" />
                <Button
                  className="w-full"
                  disabled={!canContinue}
                  onClick={handleContinue}
                >
                  Continue
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        title="Upload listing photos"
        description={`Add images up to ${formatBytes(MAX_IMAGE_BYTES)}.`}
        accept="image/*"
        dropTitle="Drag & drop photos here"
        dropSubtitle="or click to select multiple images"
        primaryActionLabel="Upload photos"
        selectedLabel="photo"
        errorMessage="Failed to upload photos. Please try again."
        tipsTitle="What photos should I upload?"
        tipsItems={[
          `No more than ${IMAGE_UPLOAD_LIMIT} listing photos may be uploaded per listing.`,
          `Limit each room category to ${MAX_IMAGES_PER_ROOM} photos for video generation.`,
          "Include a wide variety well-framed shots of key rooms and exterior."
        ]}
        maxFiles={IMAGE_UPLOAD_LIMIT}
        maxImageBytes={MAX_IMAGE_BYTES}
        compressDriveImages
        compressOversizeImages
        fileMetaLabel={(file) => formatBytes(file.size)}
        fileValidator={(file) => {
          if (!file.type.startsWith("image/")) {
            return {
              accepted: false,
              error: "Only image files are supported."
            };
          }
          if (file.size > MAX_IMAGE_BYTES) {
            return {
              accepted: false,
              error: `"${file.name}" exceeds the image size limit.`
            };
          }
          if (existingFileNames.has(file.name.toLowerCase())) {
            return {
              accepted: false,
              error: `"${file.name}" is already in this listing.`
            };
          }
          return { accepted: true };
        }}
        getUploadUrls={(requests) =>
          getListingImageUploadUrls(userId, listingId, requests)
        }
        buildRecordInput={async ({ upload, file }) => {
          if (!upload.fileName || !upload.publicUrl) {
            throw new Error("Listing upload is missing metadata.");
          }
          const metadata = await getImageMetadataFromFile(file);
          return {
            key: upload.key,
            fileName: upload.fileName,
            publicUrl: upload.publicUrl,
            metadata
          };
        }}
        onCreateRecords={async (records) => {
          const batchStartedAt = Date.now();
          try {
            const created = await runDraftSave(() =>
              createListingImageRecords(userId, listingId, records)
            );
            const createdItems = created.map((image) => ({
              id: image.id,
              url: image.url,
              filename: image.filename,
              category: image.category ?? null,
              isPrimary: image.isPrimary ?? false,
              primaryScore: image.primaryScore ?? null
            }));
            try {
              router.push(
                `/listings/${listingId}/categorize/processing?batch=${created.length}&batchStartedAt=${batchStartedAt}`
              );
            } catch (error) {
              setImages((prev) => [...createdItems, ...prev]);
              toast.error(
                (error as Error).message || "Failed to navigate to processing."
              );
            }
          } catch (error) {
            try {
              await runDraftSave(() =>
                deleteListingImageUploads(
                  userId,
                  listingId,
                  records.map((record) => record.publicUrl)
                )
              );
            } catch (cleanupError) {
              toast.error(
                (cleanupError as Error).message ||
                  "Failed to clean up listing uploads."
              );
            }
            toast.error(
              (error as Error).message || "Failed to save listing images."
            );
          }
        }}
        onUploadsComplete={({ count, batchStartedAt }) => {
          if (!listingId?.trim()) {
            return;
          }
          const batchParam =
            count > 0
              ? `?batch=${count}&batchStartedAt=${batchStartedAt}`
              : `?batchStartedAt=${batchStartedAt}`;
          router.push(
            `/listings/${listingId}/categorize/processing${batchParam}`
          );
        }}
      />
      <ListingCategoryDialog
        open={isCategoryDialogOpen}
        mode={categoryDialogMode}
        initialCategory={categoryDialogCategory ?? undefined}
        onOpenChange={setIsCategoryDialogOpen}
        onSubmit={
          categoryDialogMode === "edit"
            ? handleEditCategory
            : handleCreateCategory
        }
      />
      <ListingCategoryDeleteDialog
        open={Boolean(deleteCategory)}
        categoryLabel={formatCategoryLabel(
          deleteCategory ?? "",
          baseCategoryCounts
        )}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCategory(null);
          }
        }}
        onConfirm={handleDeleteCategory}
      />
      <ListingImageMoveDialog
        open={Boolean(moveImageId)}
        imageName={activeMoveImage?.filename ?? null}
        options={moveCategoryOptions}
        currentValue={
          activeMoveImage?.category
            ? activeMoveImage.category
            : "needs-categorization"
        }
        onOpenChange={(open) => {
          if (!open) {
            setMoveImageId(null);
          }
        }}
        onSubmit={handleMoveImage}
      />
      <ListingImageDeleteDialog
        open={Boolean(deleteImageId)}
        imageName={activeDeleteImage?.filename ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteImageId(null);
          }
        }}
        onConfirm={handleDeleteImage}
      />
    </>
  );
}
