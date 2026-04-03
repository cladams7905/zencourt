"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  PlanImageWorkspace,
  PlanUnusedDock,
  ListingCategoryDeleteDialog,
  ListingCategoryDialog
} from "@web/src/components/listings/stage/plan";
import {
  categoryUsedDropZoneId,
  UNUSED_DOCK_DROP_ZONE_ID,
  useDragAutoScroll,
  type ListingPlanViewProps,
  type ListingImageItem,
  type WorkspacePlacement
} from "@web/src/components/listings/stage/plan/shared";
import {
  usePlanActions,
  usePlanConstraints,
  usePlanListingDetails,
  usePlanMutations,
  usePlanDerivedState
} from "@web/src/components/listings/stage/plan/domain";
import { formatCategoryLabel } from "@web/src/components/listings/stage/plan/domain/categoryRules";
import { normalizeMotionVariantId } from "@web/src/server/services/videoGeneration/domain/prompt";
import {
  ListingStageFooter,
  ListingStageShell
} from "@web/src/components/listings/stage/shared";
import {
  clearStoredPlanProcessingBatch,
  getStoredPlanProcessingBatch,
  usePlanProcessingFlow
} from "@web/src/components/listings/stage/processing/domain/hooks";
import { ListingUploadAiProcessingPanel } from "@web/src/components/listings/stage/upload/subcomponents/ListingUploadAiProcessingPanel";
import { useRouter } from "next/navigation";

export function ListingPlanView({
  title,
  initialAddress,
  listingId,
  initialImages,
  hasPropertyDetails
}: ListingPlanViewProps) {
  const router = useRouter();
  const [images, setImages] = React.useState<ListingImageItem[]>(initialImages);
  const [processingBatch, setProcessingBatch] = React.useState<{
    listingId: string;
    batchImageIds: string[];
    batchStartedAt: number;
    createdImages: ListingImageItem[];
  } | null>(() => {
    const stored = getStoredPlanProcessingBatch(listingId);
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
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);
  const [placementOverrides, setPlacementOverrides] = React.useState<
    Record<string, WorkspacePlacement>
  >({});
  const [isDraggingImage, setIsDraggingImage] = React.useState(false);
  const headerRef = React.useRef<HTMLElement | null>(null);

  const {
    workspaceImages,
    dockedImages,
    usedImagesByCategory,
    accordionCategoryOrder,
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
  } = usePlanDerivedState({
    images,
    customCategories,
    placementOverrides
  });
  const { savingCount, runDraftSave, persistImageAssignments } =
    usePlanMutations({
      listingId
    });
  const { addressValue, handleContinue } = usePlanListingDetails({
    title,
    initialAddress,
    hasPropertyDetails,
    listingId,
    runDraftSave
  });
  const processingState = usePlanProcessingFlow({
    mode: "plan",
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
  usePlanConstraints({
    categoryOrder
  });

  React.useEffect(() => {
    const imageIds = new Set(images.map((image) => image.id));
    setPlacementOverrides((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id]) => imageIds.has(id))
      );
      return Object.keys(next).length === Object.keys(prev).length
        ? prev
        : next;
    });
  }, [images]);

  const {
    handleCreateCategory,
    handleEditCategory,
    handleDeleteCategory,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleSceneMotionChange
  } = usePlanActions({
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
  });
  const handleOpenCreateCategory = React.useCallback(() => {
    setCategoryDialogMode("add");
    setCategoryDialogCategory(null);
    setIsCategoryDialogOpen(true);
  }, []);
  const handleCategoryUsedDragOver = React.useCallback((category: string) => {
    setDragOverCategory(categoryUsedDropZoneId(category));
  }, []);
  const handleCategoryRowDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
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
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setDragOverCategory(null);
      }
    },
    []
  );
  const handleBackToUpload = React.useCallback(() => {
    clearStoredPlanProcessingBatch(listingId);
    setProcessingBatch(null);
    router.push(`/listings/${listingId}/stage/upload`);
  }, [listingId, router]);

  const persistCurrentSceneSelections = React.useCallback(async () => {
    const updates = workspaceImages.map((image) => {
      const motionVariantId =
        image.category && image.metadata
          ? normalizeMotionVariantId(
              image.category,
              image.metadata.perspective,
              image.metadata.videoScene?.motionVariantId ?? "default"
            )
          : image.metadata?.videoScene?.motionVariantId ?? "default";

      return {
        id: image.id,
        category: image.category ?? null,
        metadata: {
          width: image.metadata?.width ?? 0,
          height: image.metadata?.height ?? 0,
          format: image.metadata?.format ?? "unknown",
          size: image.metadata?.size ?? 0,
          lastModified: image.metadata?.lastModified ?? 0,
          ...image.metadata,
          videoScene: {
            selected: image.workspacePlacement === "used",
            motionVariantId
          }
        }
      };
    });

    setImages((current) =>
      current.map((image) => {
        const matching = updates.find((update) => update.id === image.id);
        return matching ? { ...image, metadata: matching.metadata } : image;
      })
    );

    return persistImageAssignments(updates, []);
  }, [persistImageAssignments, workspaceImages]);

  const handleContinueWithScenes = React.useCallback(async () => {
    const saved = await persistCurrentSceneSelections();
    if (!saved) {
      return;
    }
    await handleContinue();
  }, [handleContinue, persistCurrentSceneSelections]);

  return (
    <>
      <ListingStageShell
        stage="plan"
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
            onContinue={() => void handleContinueWithScenes()}
            canContinue={!isInlineProcessing && canContinue}
            isSubmitting={!isInlineProcessing && isSavingDraft}
            onBack={handleBackToUpload}
            canBack={!isInlineProcessing}
          />
        }
        footerAccessory={
          isInlineProcessing ? undefined : (
            <PlanUnusedDock
              dockedImages={dockedImages}
              dragOverCategory={dragOverCategory}
              onGlobalUnusedDockDragOver={handleGlobalUnusedDockDragOver}
              onGlobalUnusedDockDragLeave={handleGlobalUnusedDockDragLeave}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              handleGlobalUnusedDockDrop={handleDrop(UNUSED_DOCK_DROP_ZONE_ID)}
            />
          )
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
            <PlanImageWorkspace
              images={images}
              accordionCategoryOrder={accordionCategoryOrder}
              usedImagesByCategory={usedImagesByCategory}
              baseCategoryCounts={baseCategoryCounts}
              usedImageCount={usedImageCount}
              maxUsedImagesTotal={maxUsedImagesTotal}
              hasOverUsedLimit={hasOverUsedLimit}
              categoriesOverUsedLimit={categoriesOverUsedLimit}
              dragOverCategory={dragOverCategory}
              onOpenCreateCategory={handleOpenCreateCategory}
              onCategoryUsedDragOver={handleCategoryUsedDragOver}
              onCategoryRowDragLeave={handleCategoryRowDragLeave}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              onSceneMotionChange={handleSceneMotionChange}
              handleDropOnCategoryUsed={handleDrop}
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
    </>
  );
}
