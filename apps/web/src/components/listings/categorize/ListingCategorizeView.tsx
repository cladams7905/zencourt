"use client";

import * as React from "react";
import { ListingViewHeader } from "@web/src/components/listings/shared";
import { Loader2 } from "lucide-react";
import { UploadDialog } from "@web/src/components/uploads/UploadDialog";
import {
  IMAGE_UPLOAD_LIMIT,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_ROOM
} from "@shared/utils/mediaUpload";
import {
  CategorizeImageWorkspace,
  ListingCategoryDeleteDialog,
  ListingCategoryDialog,
  ListingDetailsPanel,
  ListingImageDeleteDialog,
  ListingImageMoveDialog
} from "@web/src/components/listings/categorize/components";
import { getImageMetadataFromFile } from "@web/src/lib/imageMetadata";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";
import {
  UNCATEGORIZED_CATEGORY_ID,
  useDragAutoScroll,
  type ListingCategorizeViewProps,
  type ListingImageItem
} from "@web/src/components/listings/categorize/shared";
import {
  formatBytes,
  formatCategoryLabel,
  useCategorizeActions,
  useCategorizeConstraints,
  useCategorizeListingDetails,
  useCategorizeMutations,
  useCategorizeUploads,
  useCategorizeDerivedState
} from "@web/src/components/listings/categorize/domain";
import {
  ListingTimeline,
  buildListingStageSteps
} from "@web/src/components/listings/shared";

export function ListingCategorizeView({
  title,
  initialAddress,
  listingId,
  userId,
  initialImages,
  googleMapsApiKey,
  hasPropertyDetails
}: ListingCategorizeViewProps) {
  const [images, setImages] = React.useState<ListingImageItem[]>(initialImages);
  const [dragOverCategory, setDragOverCategory] = React.useState<string | null>(
    null
  );
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
  const [isDraggingImage, setIsDraggingImage] = React.useState(false);
  const headerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    emitListingSidebarUpdate({
      id: listingId,
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  const {
    categorizedImages,
    categoryOrder,
    baseCategoryCounts,
    hasUncategorized,
    hasEmptyCategory,
    hasTooManyCategories,
    hasOverLimit
  } = useCategorizeDerivedState({
    images,
    customCategories
  });
  const {
    savingCount,
    runDraftSave,
    persistImageAssignments,
    ensurePrimaryForCategory
  } = useCategorizeMutations({
    userId,
    listingId,
    setImages
  });
  const {
    draftTitle,
    addressValue,
    setAddressValue,
    handleAddressSelect,
    handleContinue
  } = useCategorizeListingDetails({
    title,
    initialAddress,
    hasPropertyDetails,
    listingId,
    userId,
    runDraftSave
  });
  const { getUploadUrls, onCreateRecords, onUploadsComplete } =
    useCategorizeUploads({
      userId,
      listingId,
      runDraftSave,
      setImages
    });
  const [openCategories, setOpenCategories] = React.useState<string[]>(
    () => categoryOrder
  );

  React.useEffect(() => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      categoryOrder.forEach((category) => next.add(category));
      return Array.from(next);
    });
  }, [categoryOrder]);

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
    !hasTooManyCategories;
  const isSavingDraft = savingCount > 0;
  const existingFileNames = React.useMemo(() => {
    return new Set(images.map((image) => image.filename.toLowerCase()));
  }, [images]);
  const moveCategoryOptions = React.useMemo(() => {
    return categoryOrder.map((category) => {
      const count = categorizedImages[category]?.length ?? 0;
      const isLimited = category !== UNCATEGORIZED_CATEGORY_ID;
      const isFull = isLimited && count >= MAX_IMAGES_PER_ROOM;
      return {
        value: category,
        label:
          category === UNCATEGORIZED_CATEGORY_ID
            ? "Uncategorized"
            : `${formatCategoryLabel(category, baseCategoryCounts)}${
                isFull ? " (full)" : ""
              }`
      };
    });
  }, [baseCategoryCounts, categorizedImages, categoryOrder]);
  useCategorizeConstraints({
    images,
    categoryOrder,
    baseCategoryCounts,
    setImages,
    persistImageAssignments
  });

  const {
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
  } = useCategorizeActions({
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
  });
  const handleOpenUpload = React.useCallback(() => {
    setIsUploadOpen(true);
  }, []);
  const handleOpenCreateCategory = React.useCallback(() => {
    setCategoryDialogMode("create");
    setCategoryDialogCategory(null);
    setIsCategoryDialogOpen(true);
  }, []);
  const handleOpenCategoriesChange = React.useCallback(
    (categories: string[]) => {
      setOpenCategories(categories);
    },
    []
  );
  const handleCategoryDragOver = React.useCallback((category: string) => {
    setOpenCategories((prev) =>
      prev.includes(category) ? prev : [...prev, category]
    );
    setDragOverCategory((prev) => (prev === category ? prev : category));
  }, []);
  const handleCategoryDragLeave = React.useCallback(() => {
    setDragOverCategory(null);
  }, []);
  const handleOpenImageMenuChange = React.useCallback(
    (imageId: string | null) => {
      setOpenImageMenuId(imageId);
    },
    []
  );
  const handleOpenEditCategory = React.useCallback((category: string) => {
    setCategoryDialogMode("edit");
    setCategoryDialogCategory(category);
    setIsCategoryDialogOpen(true);
  }, []);
  const handleRequestDeleteCategory = React.useCallback((category: string) => {
    setDeleteCategory(category);
  }, []);
  const handleRequestMoveImage = React.useCallback((imageId: string) => {
    setMoveImageId(imageId);
  }, []);
  const handleRequestDeleteImage = React.useCallback((imageId: string) => {
    setDeleteImageId(imageId);
  }, []);

  return (
    <>
      <ListingViewHeader
        ref={headerRef}
        title={draftTitle}
        timeline={
          <ListingTimeline
            steps={buildListingStageSteps("categorize")}
            className="mb-0"
          />
        }
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
          <CategorizeImageWorkspace
            images={images}
            categoryOrder={categoryOrder}
            categorizedImages={categorizedImages}
            baseCategoryCounts={baseCategoryCounts}
            openCategories={openCategories}
            dragOverCategory={dragOverCategory}
            openImageMenuId={openImageMenuId}
            onOpenUpload={handleOpenUpload}
            onOpenCreateCategory={handleOpenCreateCategory}
            onOpenCategoriesChange={handleOpenCategoriesChange}
            onCategoryDragOver={handleCategoryDragOver}
            onCategoryDragLeave={handleCategoryDragLeave}
            onOpenImageMenuChange={handleOpenImageMenuChange}
            onEditCategory={handleOpenEditCategory}
            onDeleteCategory={handleRequestDeleteCategory}
            onRequestMoveImage={handleRequestMoveImage}
            onRequestDeleteImage={handleRequestDeleteImage}
            handleSetPrimaryImage={handleSetPrimaryImage}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            handleDrop={handleDrop}
          />

          <ListingDetailsPanel
            addressValue={addressValue}
            setAddressValue={setAddressValue}
            googleMapsApiKey={googleMapsApiKey}
            canContinue={canContinue}
            hasUncategorized={hasUncategorized}
            hasEmptyCategory={hasEmptyCategory}
            needsAddress={needsAddress}
            hasOverLimit={hasOverLimit}
            hasTooManyCategories={hasTooManyCategories}
            handleAddressSelect={handleAddressSelect}
            handleContinue={handleContinue}
          />
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
        getUploadUrls={(requests) => getUploadUrls(requests)}
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
        onCreateRecords={onCreateRecords}
        onUploadsComplete={onUploadsComplete}
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
