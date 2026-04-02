"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  CategorizeImageWorkspace,
  ListingCategoryDeleteDialog,
  ListingCategoryDialog,
  ListingImageDeleteDialog,
  ListingImageMoveDialog
} from "@web/src/components/listings/stage/categorize";
import {
  categoryDockDropZoneId,
  categoryUsedDropZoneId,
  UNCATEGORIZED_CATEGORY_ID,
  UNUSED_DOCK_DROP_ZONE_ID,
  useDragAutoScroll,
  type ListingCategorizeViewProps,
  type ListingImageItem,
  type WorkspacePlacement
} from "@web/src/components/listings/stage/categorize/shared";
import {
  useCategorizeActions,
  useCategorizeConstraints,
  useCategorizeListingDetails,
  useCategorizeMutations,
  useCategorizeDerivedState
} from "@web/src/components/listings/stage/categorize/domain";
import { formatCategoryLabel } from "@web/src/components/listings/stage/categorize/domain/categoryRules";
import {
  ListingStageFooter,
  ListingStageShell
} from "@web/src/components/listings/stage/shared";
import {
  clearStoredCategorizeProcessingBatch,
  getStoredCategorizeProcessingBatch,
  useCategorizeProcessingFlow
} from "@web/src/components/listings/stage/processing/domain/hooks";
import { ListingUploadAiProcessingPanel } from "@web/src/components/listings/stage/upload/subcomponents/ListingUploadAiProcessingPanel";
import { useRouter } from "next/navigation";

export function ListingCategorizeView({
  title,
  initialAddress,
  listingId,
  initialImages,
  hasPropertyDetails
}: ListingCategorizeViewProps) {
  const router = useRouter();
  const [images, setImages] = React.useState<ListingImageItem[]>(initialImages);
  const [processingBatch, setProcessingBatch] = React.useState<{
    listingId: string;
    batchImageIds: string[];
    batchStartedAt: number;
    createdImages: ListingImageItem[];
  } | null>(() => {
    const stored = getStoredCategorizeProcessingBatch(listingId);
    if (!stored) {
      return null;
    }
    return {
      listingId,
      batchImageIds: stored.batchImageIds,
      batchStartedAt: stored.batchStartedAt ?? Date.now(),
      createdImages: []
    };
  });
  const [dragOverCategory, setDragOverCategory] = React.useState<string | null>(
    null
  );
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = React.useState<
    "add" | "edit"
  >("add");
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
  const [placementOverrides, setPlacementOverrides] = React.useState<
    Record<string, WorkspacePlacement>
  >({});
  const [isDraggingImage, setIsDraggingImage] = React.useState(false);
  const headerRef = React.useRef<HTMLElement | null>(null);

  const {
    dockedImages,
    usedImagesByCategory,
    dockedImagesByCategory,
    workspaceCategoryOrder,
    categoryUsageCounts,
    categoriesOverUsedLimit,
    usedImageCount,
    hasOverUsedLimit,
    maxUsedImagesTotal,
    categoryOrder,
    baseCategoryCounts,
    hasUncategorized,
    hasEmptyCategory,
    hasTooManyCategories,
    hasOverLimit
  } = useCategorizeDerivedState({
    images,
    customCategories,
    placementOverrides
  });
  const {
    savingCount,
    runDraftSave,
    persistImageAssignments
  } = useCategorizeMutations({
    listingId
  });
  const { addressValue, handleContinue } = useCategorizeListingDetails({
    title,
    initialAddress,
    hasPropertyDetails,
    listingId,
    runDraftSave
  });
  const processingState = useCategorizeProcessingFlow({
    mode: "categorize",
    listingId,
    batchImageIds: processingBatch?.batchImageIds,
    batchStartedAt: processingBatch?.batchStartedAt,
    navigate: (url) => {
      setProcessingBatch(null);
      router.replace(url);
    }
  });
  const isInlineProcessing = processingBatch !== null;

  const endDragSession = React.useCallback(() => {
    setIsDraggingImage(false);
    setDragOverCategory(null);
  }, []);
  const { lastDragClientYRef } = useDragAutoScroll({
    enabled: isDraggingImage,
    anchorRef: headerRef,
    onDragSessionEnd: endDragSession
  });
  const needsAddress = addressValue.trim() === "";
  const canContinue =
    !hasUncategorized &&
    !hasEmptyCategory &&
    !needsAddress &&
    !hasOverLimit &&
    !hasTooManyCategories &&
    !hasOverUsedLimit;
  const isSavingDraft = savingCount > 0;
  const moveCategoryOptions = React.useMemo(() => {
    return categoryOrder.map((category) => {
      return {
        value: category,
        label:
          category === UNCATEGORIZED_CATEGORY_ID
            ? "Uncategorized"
            : formatCategoryLabel(category, baseCategoryCounts)
      };
    });
  }, [baseCategoryCounts, categoryOrder]);
  useCategorizeConstraints({
    categoryOrder
  });

  React.useEffect(() => {
    const imageIds = new Set(images.map((image) => image.id));
    setPlacementOverrides((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id]) => imageIds.has(id))
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [images]);

  const {
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
    handleDropOnCategoryUnusedStrip
  } = useCategorizeActions({
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
  });
  const handleOpenCreateCategory = React.useCallback(() => {
    setCategoryDialogMode("add");
    setCategoryDialogCategory(null);
    setIsCategoryDialogOpen(true);
  }, []);
  const handleCategoryUsedDragOver = React.useCallback((category: string) => {
    setDragOverCategory(categoryUsedDropZoneId(category));
  }, []);
  const handleCategoryUnusedDragOver = React.useCallback((category: string) => {
    setDragOverCategory(categoryDockDropZoneId(category));
  }, []);
  const handleCategoryRowDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (
        !event.currentTarget.contains(event.relatedTarget as Node | null)
      ) {
        setDragOverCategory(null);
      }
    },
    []
  );
  const handleGlobalUnusedDockDragOver = React.useCallback(() => {
    setDragOverCategory((prev) =>
      prev === UNUSED_DOCK_DROP_ZONE_ID ? prev : UNUSED_DOCK_DROP_ZONE_ID
    );
  }, []);
  const handleGlobalUnusedDockDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (
        !event.currentTarget.contains(event.relatedTarget as Node | null)
      ) {
        setDragOverCategory(null);
      }
    },
    []
  );
  const handleOpenImageMenuChange = React.useCallback(
    (imageId: string | null) => {
      setOpenImageMenuId(imageId);
    },
    []
  );
  const handleRequestMoveImage = React.useCallback((imageId: string) => {
    setMoveImageId(imageId);
  }, []);
  const handleRequestDeleteImage = React.useCallback((imageId: string) => {
    setDeleteImageId(imageId);
  }, []);
  const handleBackToUpload = React.useCallback(() => {
    clearStoredCategorizeProcessingBatch(listingId);
    setProcessingBatch(null);
    router.push(`/listings/${listingId}/stage/upload`);
  }, [listingId, router]);

  return (
    <>
      <ListingStageShell
        stage="categorize"
        wide
        headerRef={headerRef}
        headerAction={
          isSavingDraft ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </div>
          ) : null
        }
        footer={
          <ListingStageFooter
            onContinue={() => void handleContinue()}
            canContinue={!isInlineProcessing && canContinue}
            isSubmitting={!isInlineProcessing && isSavingDraft}
            onBack={handleBackToUpload}
            canBack={!isInlineProcessing}
          />
        }
      >
        {isInlineProcessing ? (
          <ListingUploadAiProcessingPanel
            images={
              processingState.batchImages.length > 0
                ? processingState.batchImages
                : processingBatch.createdImages
            }
            batchCompleted={processingState.batchCompleted}
            batchTotal={processingState.batchTotal}
            processingCount={processingState.processingCount}
          />
        ) : (
          <div
            className="flex w-full flex-col gap-6"
            onDragOver={(event) => {
              lastDragClientYRef.current = event.clientY;
            }}
          >
            <CategorizeImageWorkspace
              images={images}
              workspaceCategoryOrder={workspaceCategoryOrder}
              usedImagesByCategory={usedImagesByCategory}
              dockedImagesByCategory={dockedImagesByCategory}
              dockedImagesCount={dockedImages.length}
              baseCategoryCounts={baseCategoryCounts}
              usedImageCount={usedImageCount}
              maxUsedImagesTotal={maxUsedImagesTotal}
              hasOverUsedLimit={hasOverUsedLimit}
              categoriesOverUsedLimit={categoriesOverUsedLimit}
              dragOverCategory={dragOverCategory}
              openImageMenuId={openImageMenuId}
              onOpenCreateCategory={handleOpenCreateCategory}
              onCategoryUsedDragOver={handleCategoryUsedDragOver}
              onCategoryUnusedDragOver={handleCategoryUnusedDragOver}
              onCategoryRowDragLeave={handleCategoryRowDragLeave}
              onGlobalUnusedDockDragOver={handleGlobalUnusedDockDragOver}
              onGlobalUnusedDockDragLeave={handleGlobalUnusedDockDragLeave}
              onOpenImageMenuChange={handleOpenImageMenuChange}
              onRequestMoveImage={handleRequestMoveImage}
              onRequestDeleteImage={handleRequestDeleteImage}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              handleDropOnCategoryUsed={handleDrop}
              handleDropOnCategoryUnusedStrip={handleDropOnCategoryUnusedStrip}
              handleGlobalUnusedDockDrop={handleDrop(UNUSED_DOCK_DROP_ZONE_ID)}
            />
          </div>
        )}
      </ListingStageShell>
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
            : UNCATEGORIZED_CATEGORY_ID
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
