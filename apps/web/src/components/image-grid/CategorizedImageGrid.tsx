/**
 * CategorizedImageGrid Component
 *
 * Comprehensive image grid with all features:
 * - Category display with collapsible sections
 * - Image preview modal (optional)
 * - Drag-and-drop re-categorization (optional)
 * - Editable category labels (optional)
 * - Loading and error states
 */

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import * as Icons from "lucide-react";
import type { ProcessedImage } from "../../types/images";
import { ImagePreviewModal } from "../modals/ImagePreviewModal";
import { EditableCategoryLabel } from "../shared/EditableCategoryLabel";
import Image from "next/image";
import { CategorizedGroup, RoomCategory } from "../../types/roomCategory";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CategorizedImageGridProps {
  /** Organized category groups with images */
  groups: CategorizedGroup[];
  /** Callback when an image is clicked */
  onImageClick?: (
    image: ProcessedImage,
    categoryIndex: number,
    imageIndex: number
  ) => void;
  /** Callback to retry failed image */
  onRetryImage?: (image: ProcessedImage) => void;
  /** Callback when images are re-categorized via drag-drop */
  onRecategorize?: (
    imageId: string,
    fromCategoryIndex: number,
    toCategoryIndex: number
  ) => void;
  /** Callback when category is renamed */
  onCategoryRename?: (
    categoryIndex: number,
    newLabel: string,
    newCategoryId?: RoomCategory
  ) => void;
  /** Show confidence badges on images */
  showConfidence?: boolean;
  /** Enable image selection mode */
  selectable?: boolean;
  /** Currently selected image IDs */
  selectedImageIds?: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (imageIds: Set<string>) => void;
  /** Enable image preview modal on click (default: true) */
  enablePreview?: boolean;
  /** Enable drag-and-drop re-categorization (default: false) */
  enableDragDrop?: boolean;
  /** Enable category renaming (default: false) */
  enableRenaming?: boolean;
  /** Show preview metadata (default: true) */
  showPreviewMetadata?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

interface DragState {
  isDragging: boolean;
  draggedImage: ProcessedImage | null;
  sourceCategoryIndex: number | null;
  sourceImageIndex: number | null;
  dropTargetCategoryIndex: number | null;
}

// ============================================================================
// Main Component
// ============================================================================

export function CategorizedImageGrid({
  groups,
  onImageClick,
  onRetryImage,
  onRecategorize,
  onCategoryRename,
  showConfidence = true,
  selectable = false,
  selectedImageIds = new Set(),
  onSelectionChange,
  enablePreview = true,
  enableDragDrop = false,
  enableRenaming = false,
  showPreviewMetadata = true,
  emptyMessage = "No images to display"
}: CategorizedImageGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(groups.map((g, i) => `${g.category}-${i}`))
  );

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedImage: null,
    sourceCategoryIndex: null,
    sourceImageIndex: null,
    dropTargetCategoryIndex: null
  });

  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    currentIndex: number;
  }>({
    isOpen: false,
    currentIndex: 0
  });

  // Cleanup auto-scroll on unmount or when dragging stops
  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, []);

  // Flatten all images for preview navigation
  const allImages = useMemo(() => {
    const images: Array<{
      image: ProcessedImage;
      categoryInfo: { displayLabel: string; color: string };
    }> = [];
    groups.forEach((group) => {
      group.images.forEach((image) => {
        images.push({
          image,
          categoryInfo: {
            displayLabel: group.displayLabel,
            color: group.metadata.color
          }
        });
      });
    });
    return images;
  }, [groups]);

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  const handleImageSelect = (imageId: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedImageIds);
    if (next.has(imageId)) {
      next.delete(imageId);
    } else {
      next.add(imageId);
    }
    onSelectionChange(next);
  };

  const handleImageClickInternal = (
    image: ProcessedImage,
    categoryIndex: number,
    imageIndex: number
  ) => {
    // Custom click handler takes priority
    if (onImageClick) {
      onImageClick(image, categoryIndex, imageIndex);
      return;
    }

    // Open preview if enabled
    if (enablePreview) {
      const globalIndex = allImages.findIndex(
        (item) => item.image.id === image.id
      );
      if (globalIndex !== -1) {
        setPreviewState({ isOpen: true, currentIndex: globalIndex });
      }
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    image: ProcessedImage,
    categoryIndex: number,
    imageIndex: number
  ) => {
    if (!enableDragDrop) return;
    e.dataTransfer.effectAllowed = "move";
    setDragState({
      isDragging: true,
      draggedImage: image,
      sourceCategoryIndex: categoryIndex,
      sourceImageIndex: imageIndex,
      dropTargetCategoryIndex: null
    });
  };

  const handleDragEnd = () => {
    // Clear auto-scroll interval
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    setDragState({
      isDragging: false,
      draggedImage: null,
      sourceCategoryIndex: null,
      sourceImageIndex: null,
      dropTargetCategoryIndex: null
    });
  };

  const handleDragOver = (e: React.DragEvent, categoryIndex: number) => {
    if (!enableDragDrop || !dragState.isDragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Auto-scroll logic - find the scrollable parent container
    if (containerRef.current) {
      // Find the closest scrollable parent
      let scrollContainer: HTMLElement | null = containerRef.current;
      while (scrollContainer) {
        const style = window.getComputedStyle(scrollContainer);
        const isScrollable =
          style.overflowY === "auto" ||
          style.overflowY === "scroll" ||
          scrollContainer === document.documentElement;

        if (
          isScrollable &&
          scrollContainer.scrollHeight > scrollContainer.clientHeight
        ) {
          break;
        }

        scrollContainer = scrollContainer.parentElement;
      }

      if (scrollContainer) {
        const rect = scrollContainer.getBoundingClientRect();
        const mouseY = e.clientY;
        const scrollThreshold = 100; // pixels from edge to start scrolling
        const scrollSpeed = 10; // pixels per interval

        // Clear existing interval
        if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current);
          autoScrollIntervalRef.current = null;
        }

        // Scroll up when near top
        if (mouseY - rect.top < scrollThreshold) {
          autoScrollIntervalRef.current = setInterval(() => {
            scrollContainer!.scrollTop -= scrollSpeed;
          }, 16); // ~60fps
        }
        // Scroll down when near bottom
        else if (rect.bottom - mouseY < scrollThreshold) {
          autoScrollIntervalRef.current = setInterval(() => {
            scrollContainer!.scrollTop += scrollSpeed;
          }, 16);
        }
      }
    }

    if (dragState.dropTargetCategoryIndex !== categoryIndex) {
      setDragState((prev) => ({
        ...prev,
        dropTargetCategoryIndex: categoryIndex
      }));
    }
  };

  const handleDrop = (e: React.DragEvent, targetCategoryIndex: number) => {
    if (!enableDragDrop || !dragState.isDragging || !onRecategorize) return;
    e.preventDefault();

    const { draggedImage, sourceCategoryIndex } = dragState;
    if (
      draggedImage &&
      sourceCategoryIndex !== null &&
      sourceCategoryIndex !== targetCategoryIndex
    ) {
      onRecategorize(draggedImage.id, sourceCategoryIndex, targetCategoryIndex);
    }
    handleDragEnd();
  };

  // Empty state
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icons.ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const currentImageData = allImages[previewState.currentIndex];

  return (
    <>
      <div ref={containerRef} className="space-y-6">
        {/* Drag Instructions */}
        {enableDragDrop && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Icons.Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Tip:</strong> Drag and drop images between categories to
              re-categorize.
            </div>
          </div>
        )}

        {groups.map((group, categoryIndex) => {
          const categoryKey = `${group.category}-${categoryIndex}`;
          const isExpanded = expandedCategories.has(categoryKey);
          const isDropTarget =
            dragState.dropTargetCategoryIndex === categoryIndex;
          const isSourceCategory =
            dragState.sourceCategoryIndex === categoryIndex;

          return (
            <div
              key={categoryKey}
              className={`border rounded-lg bg-white overflow-hidden transition-all ${
                isDropTarget ? "ring-4 ring-blue-400 shadow-lg" : ""
              } ${
                isSourceCategory && dragState.isDragging ? "opacity-50" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, categoryIndex)}
              onDrop={(e) => handleDrop(e, categoryIndex)}
            >
              {/* Category Header */}
              <CategoryHeader
                group={group}
                categoryIndex={categoryIndex}
                isExpanded={isExpanded}
                onToggle={() => toggleCategory(categoryKey)}
                onRename={
                  enableRenaming && onCategoryRename
                    ? (newLabel, newCategoryId) =>
                        onCategoryRename(categoryIndex, newLabel, newCategoryId)
                    : undefined
                }
                enableRenaming={enableRenaming}
              />

              {/* Image Grid */}
              {isExpanded && (
                <div className="p-4">
                  {isDropTarget && dragState.isDragging && (
                    <div className="mb-4 p-4 border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg text-center text-blue-700">
                      <Icons.Download className="w-6 h-6 mx-auto mb-2" />
                      Drop here to move to <strong>{group.displayLabel}</strong>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {group.images.map((image, imageIndex) => (
                      <ImageThumbnail
                        key={image.id}
                        image={image}
                        category={group.displayLabel}
                        categoryIndex={categoryIndex}
                        imageIndex={imageIndex}
                        onClick={() =>
                          handleImageClickInternal(
                            image,
                            categoryIndex,
                            imageIndex
                          )
                        }
                        onRetry={
                          onRetryImage && image.status === "error"
                            ? () => onRetryImage(image)
                            : undefined
                        }
                        showConfidence={showConfidence}
                        isSelected={
                          selectable && selectedImageIds.has(image.id)
                        }
                        onSelect={
                          selectable
                            ? () => handleImageSelect(image.id)
                            : undefined
                        }
                        enableDrag={enableDragDrop}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={
                          dragState.isDragging &&
                          dragState.draggedImage?.id === image.id
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {enablePreview && previewState.isOpen && currentImageData && (
        <ImagePreviewModal
          isOpen={previewState.isOpen}
          onClose={() =>
            setPreviewState((prev) => ({ ...prev, isOpen: false }))
          }
          currentImage={currentImageData.image}
          allImages={allImages.map((item) => item.image)}
          currentIndex={previewState.currentIndex}
          onNavigate={(index) =>
            setPreviewState({ isOpen: true, currentIndex: index })
          }
          categoryInfo={currentImageData.categoryInfo}
          showMetadata={showPreviewMetadata}
        />
      )}
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface CategoryHeaderProps {
  group: CategorizedGroup;
  categoryIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRename?: (newLabel: string, newCategoryId?: RoomCategory) => void;
  enableRenaming: boolean;
}

function CategoryHeader({
  group,
  isExpanded,
  onToggle,
  onRename,
  enableRenaming
}: CategoryHeaderProps) {
  const IconComponent =
    (Icons as unknown as Record<string, typeof Icons.Circle>)[
      group.metadata.icon
    ] || Icons.Circle;

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.metadata.color }}
        />
        <IconComponent className="w-5 h-5 text-gray-600" />
        <div className="flex items-center gap-2">
          {enableRenaming && onRename ? (
            <div onClick={(e) => e.stopPropagation()}>
              <EditableCategoryLabel
                currentLabel={group.displayLabel}
                categoryId={group.category}
                onRename={onRename}
                editable={true}
                showCategorySelector={true}
              />
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-lg">{group.displayLabel}</h3>
              <span className="text-sm text-gray-500">
                ({group.images.length}{" "}
                {group.images.length === 1 ? "image" : "images"})
              </span>
            </>
          )}
        </div>
        {group.avgConfidence > 0 && (
          <span className="ml-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
            {(group.avgConfidence * 100).toFixed(0)}% avg
          </span>
        )}
      </div>
      {isExpanded ? (
        <Icons.ChevronUp className="w-5 h-5 text-gray-400" />
      ) : (
        <Icons.ChevronDown className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );
}

interface ImageThumbnailProps {
  image: ProcessedImage;
  category: string;
  categoryIndex: number;
  imageIndex: number;
  onClick?: () => void;
  onRetry?: () => void;
  showConfidence: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  enableDrag: boolean;
  onDragStart: (
    e: React.DragEvent,
    image: ProcessedImage,
    categoryIndex: number,
    imageIndex: number
  ) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function ImageThumbnail({
  image,
  category,
  categoryIndex,
  imageIndex,
  onClick,
  onRetry,
  showConfidence,
  isSelected,
  onSelect,
  enableDrag,
  onDragStart,
  onDragEnd,
  isDragging
}: ImageThumbnailProps) {
  const isLoading =
    image.status === "analyzing" || image.status === "uploading";
  const isError = image.status === "error";
  const confidence = image.classification?.confidence || 0;

  return (
    <div
      className={`relative group ${isDragging ? "opacity-30" : ""}`}
      draggable={enableDrag && !isLoading && !isError}
      onDragStart={(e) => onDragStart(e, image, categoryIndex, imageIndex)}
      onDragEnd={onDragEnd}
    >
      {onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded border-2 border-white shadow-lg cursor-pointer"
          />
        </div>
      )}

      {enableDrag && !isLoading && !isError && (
        <div className="absolute top-2 right-2 z-10 p-1 bg-black/50 hover:bg-black bg-opacity-50 rounded cursor-move">
          <Icons.GripVertical className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        onClick={onClick}
        className={`relative aspect-square rounded-lg overflow-hidden ${
          onClick ? "cursor-pointer" : ""
        } ${isSelected ? "ring-4 ring-blue-500" : ""}`}
      >
        <Image
          src={image.uploadUrl || image.previewUrl}
          alt={category}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`object-cover transition-transform ${
            onClick ? "group-hover:scale-105" : ""
          }`}
        />

        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="flex flex-col items-center text-white">
              <Icons.Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs">
                {image.status === "uploading" ? "Uploading..." : "Analyzing..."}
              </span>
            </div>
          </div>
        )}

        {isError && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center">
            <div className="flex flex-col items-center text-white p-2">
              <Icons.AlertCircle className="w-8 h-8 mb-2" />
              <span className="text-xs text-center">
                {image.error || "Failed"}
              </span>
              {onRetry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                  className="mt-2 px-3 py-1 bg-white text-red-600 text-xs rounded hover:bg-gray-100"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {!isLoading && !isError && onClick && (
          <div className="absolute inset-0 bg-opacity-0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <Icons.Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {!isLoading && !isError && showConfidence && confidence > 0 && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 bg-opacity-75 text-white text-xs rounded">
            {(confidence * 100).toFixed(0)}%
          </div>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-500 truncate">{image.file.name}</p>
    </div>
  );
}

export default CategorizedImageGrid;
