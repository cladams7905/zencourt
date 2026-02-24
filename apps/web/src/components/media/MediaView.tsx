"use client";

import * as React from "react";
import { ViewHeader } from "@web/src/components/view/ViewHeader";
import { UploadDialog } from "@web/src/components/uploads/orchestrators/UploadDialog";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@shared/utils/mediaUpload";
import { getUserMediaUploadUrlsForCurrentUser } from "@web/src/server/actions/media/commands";
import {
  useMediaFilters,
  useMediaMutations,
  useMediaPagination,
  filterAndSortMedia,
  buildMediaCounts,
  validateMediaFile,
  buildUploadRecordInput,
  getMediaFileMetaLabel
} from "@web/src/components/media/domain";
import {
  MEDIA_PAGE_SIZE,
  type MediaViewProps
} from "@web/src/components/media/shared";
import {
  DeleteMediaDialog,
  MediaCard,
  MediaEmptyState,
  MediaFilterEmptyState,
  MediaHelpCard,
  MediaToolbar
} from "@web/src/components/media/components";
import { formatBytes } from "@web/src/lib/core/formatting/bytes";

const MediaView = ({ initialMedia = [] }: MediaViewProps) => {
  const { selectedTypes, usageSort, setUsageSort, handleTypeToggle } =
    useMediaFilters();
  const {
    mediaItems,
    isUploadOpen,
    setIsUploadOpen,
    handleCreateRecords,
    isDeleteOpen,
    mediaToDelete,
    isDeleting,
    handleRequestDelete,
    handleDeleteDialogChange,
    handleConfirmDelete
  } = useMediaMutations({
    initialMedia
  });

  const filteredBrandKitItems = React.useMemo(
    () =>
      filterAndSortMedia({
        mediaItems,
        selectedTypes,
        usageSort
      }),
    [mediaItems, selectedTypes, usageSort]
  );

  const paginationResetDeps = React.useMemo(
    () => [selectedTypes, usageSort, mediaItems.length],
    [selectedTypes, usageSort, mediaItems.length]
  );
  const { visibleCount, loadMoreRef, hasMore } = useMediaPagination({
    pageSize: MEDIA_PAGE_SIZE,
    totalCount: filteredBrandKitItems.length,
    resetDeps: paginationResetDeps
  });

  const { totalImages, totalVideos } = React.useMemo(
    () => buildMediaCounts(mediaItems),
    [mediaItems]
  );
  const hasAnyBrandKitMedia = mediaItems.length > 0;
  const hasFilteredBrandKitMedia = filteredBrandKitItems.length > 0;
  const visibleBrandKitItems = filteredBrandKitItems.slice(0, visibleCount);

  return (
    <>
      <ViewHeader
        title="Media Library"
        subtitle="Manage your own photos and b-roll assets for social media."
      />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-10 px-8 py-8">
        <MediaHelpCard />

        <section className="space-y-6">
          <MediaToolbar
            totalImages={totalImages}
            totalVideos={totalVideos}
            selectedTypes={selectedTypes}
            usageSort={usageSort}
            onUploadClick={() => setIsUploadOpen(true)}
            onTypeToggle={handleTypeToggle}
            onUsageSortChange={setUsageSort}
          />

          {hasAnyBrandKitMedia ? (
            hasFilteredBrandKitMedia ? (
              <div className="columns-1 gap-6 sm:columns-2 xl:columns-4 2xl:columns-4">
                {visibleBrandKitItems.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onDelete={handleRequestDelete}
                  />
                ))}
              </div>
            ) : (
              <MediaFilterEmptyState />
            )
          ) : (
            <MediaEmptyState />
          )}

          {hasFilteredBrandKitMedia && hasMore && (
            <div
              ref={loadMoreRef}
              className="flex items-center justify-center py-6 text-xs text-muted-foreground"
            >
              Loading more…
            </div>
          )}
        </section>
      </div>

      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        title="Upload media"
        description={`Add images up to ${formatBytes(
          MAX_IMAGE_BYTES
        )} and videos up to ${formatBytes(MAX_VIDEO_BYTES)}.`}
        accept="image/*,video/*"
        dropTitle="Drag & drop files here"
        dropSubtitle="or click to select multiple files"
        primaryActionLabel="Upload media"
        errorMessage="Failed to upload media. Please try again."
        maxImageBytes={MAX_IMAGE_BYTES}
        compressDriveImages
        compressOversizeImages
        fileValidator={validateMediaFile}
        getUploadUrls={getUserMediaUploadUrlsForCurrentUser}
        buildRecordInput={buildUploadRecordInput}
        onCreateRecords={handleCreateRecords}
        fileMetaLabel={getMediaFileMetaLabel}
        thumbnailFailureMessage={(count) =>
          `${count} video thumbnail(s) could not be generated.`
        }
      />

      <DeleteMediaDialog
        open={isDeleteOpen}
        isDeleting={isDeleting}
        canDelete={Boolean(mediaToDelete)}
        onOpenChange={handleDeleteDialogChange}
        onCancel={() => handleDeleteDialogChange(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export { MediaView };
