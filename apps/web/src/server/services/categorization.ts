/**
 * Room Categorization Utilities
 *
 * Provides utilities for categorizing and organizing property images
 * by room type with intelligent numbering and sorting.
 */
import type { ProcessedImage } from "../../types/images";
import {
  CategorizedGroup,
  ROOM_CATEGORIES,
  RoomCategory,
  RoomCategoryMetadata
} from "../../types/roomCategory";

/**
 * Organized categories result
 */
interface OrganizedCategories {
  /** All category groups, sorted by display order */
  groups: CategorizedGroup[];
  /** Total number of images */
  totalImages: number;
  /** Number of categories with images */
  categoryCount: number;
  /** Images grouped by category for easy lookup */
  byCategory: Record<string, ProcessedImage[]>;
}

/**
 * Categorize and organize images with intelligent numbering
 *
 * @param images - Array of processed images with classifications
 * @param options - Categorization options
 * @returns Organized categories with numbering and sorting
 */
export function categorizeAndOrganizeImages(
  images: ProcessedImage[],
  options: {
    /** Minimum confidence to include (default: 0) */
    minConfidence?: number;
    /** Place low-confidence images in "other" (default: true) */
    moveLowConfidenceToOther?: boolean;
    /** Confidence threshold for "other" category (default: 0.5) */
    lowConfidenceThreshold?: number;
  } = {}
): OrganizedCategories {
  const {
    minConfidence = 0,
    moveLowConfidenceToOther = true,
    lowConfidenceThreshold = 0.5
  } = options;

  // Filter and group images by category
  const groupedByCategory: Record<string, ProcessedImage[]> = {};

  images.forEach((image) => {
    if (!image.classification) return;

    const confidence = image.classification.confidence;

    // Skip if below minimum confidence
    if (confidence < minConfidence) return;

    // Move low confidence to "other" if enabled
    let category = image.classification.category;
    if (
      moveLowConfidenceToOther &&
      confidence < lowConfidenceThreshold &&
      category !== "other"
    ) {
      category = "other";
    }

    if (!groupedByCategory[category]) {
      groupedByCategory[category] = [];
    }

    groupedByCategory[category].push(image);
  });

  // Create numbered groups for categories that allow numbering
  const categorizedGroups: CategorizedGroup[] = [];

  Object.entries(groupedByCategory).forEach(([category, categoryImages]) => {
    const metadata = ROOM_CATEGORIES[category as RoomCategory];

    if (!metadata) {
      console.warn(`Unknown category: ${category}`);
      return;
    }

    // Calculate average confidence
    const avgConfidence =
      categoryImages.reduce(
        (sum, img) => sum + (img.classification?.confidence || 0),
        0
      ) / categoryImages.length;

    // Check if this category should be numbered
    if (metadata.allowNumbering && categoryImages.length > 1) {
      // Create numbered groups (one image per group)
      categoryImages.forEach((image, index) => {
        const roomNumber = index + 1;
        categorizedGroups.push({
          category: category as RoomCategory,
          displayLabel: `${metadata.label} ${roomNumber}`,
          baseLabel: metadata.label,
          roomNumber,
          metadata,
          images: [image],
          avgConfidence: image.classification?.confidence || 0
        });
      });
    } else {
      // Single group for all images
      categorizedGroups.push({
        category: category as RoomCategory,
        displayLabel: metadata.label,
        baseLabel: metadata.label,
        metadata,
        images: categoryImages,
        avgConfidence
      });
    }
  });

  // Sort groups by category order
  categorizedGroups.sort((a, b) => {
    // First by category order
    if (a.metadata.order !== b.metadata.order) {
      return a.metadata.order - b.metadata.order;
    }
    // Then by room number if applicable
    if (a.roomNumber && b.roomNumber) {
      return a.roomNumber - b.roomNumber;
    }
    return 0;
  });

  return {
    groups: categorizedGroups,
    totalImages: images.filter((img) => img.classification).length,
    categoryCount: Object.keys(groupedByCategory).length,
    byCategory: groupedByCategory
  };
}

/**
 * Get category metadata by ID
 */
export function getCategoryMetadata(
  category: RoomCategory
): RoomCategoryMetadata {
  return ROOM_CATEGORIES[category];
}

/**
 * Get all categories sorted by order
 */
export function getAllCategoriesSorted(): RoomCategoryMetadata[] {
  return Object.values(ROOM_CATEGORIES).sort((a, b) => a.order - b.order);
}

/**
 * Get categories grouped by their group type
 */
export function getCategoriesByGroup(): Record<string, RoomCategoryMetadata[]> {
  const grouped: Record<string, RoomCategoryMetadata[]> = {
    exterior: [],
    living: [],
    private: [],
    utility: [],
    other: []
  };

  Object.values(ROOM_CATEGORIES).forEach((category) => {
    grouped[category.group].push(category);
  });

  // Sort within each group
  Object.keys(grouped).forEach((group) => {
    grouped[group].sort((a, b) => a.order - b.order);
  });

  return grouped;
}

/**
 * Count images by category group
 */
export function countImagesByGroup(
  organized: OrganizedCategories
): Record<string, number> {
  const counts: Record<string, number> = {
    exterior: 0,
    living: 0,
    private: 0,
    utility: 0,
    other: 0
  };

  organized.groups.forEach((group) => {
    counts[group.metadata.group] += group.images.length;
  });

  return counts;
}

/**
 * Filter categories by confidence threshold
 */
export function filterByConfidence(
  organized: OrganizedCategories,
  minConfidence: number
): OrganizedCategories {
  const filteredGroups = organized.groups
    .map((group) => ({
      ...group,
      images: group.images.filter(
        (img) => (img.classification?.confidence || 0) >= minConfidence
      )
    }))
    .filter((group) => group.images.length > 0);

  const totalImages = filteredGroups.reduce(
    (sum, group) => sum + group.images.length,
    0
  );

  // Rebuild byCategory
  const byCategory: Record<string, ProcessedImage[]> = {};
  filteredGroups.forEach((group) => {
    const key = group.roomNumber
      ? `${group.category}-${group.roomNumber}`
      : group.category;
    byCategory[key] = group.images;
  });

  return {
    groups: filteredGroups,
    totalImages,
    categoryCount: filteredGroups.length,
    byCategory
  };
}

/**
 * Reorder images within categories
 */
export function reorderImagesInCategory(
  organized: OrganizedCategories,
  categoryIndex: number,
  fromIndex: number,
  toIndex: number
): OrganizedCategories {
  const newGroups = [...organized.groups];
  const group = newGroups[categoryIndex];

  if (!group || fromIndex < 0 || toIndex < 0) {
    return organized;
  }

  const newImages = [...group.images];
  const [movedImage] = newImages.splice(fromIndex, 1);
  newImages.splice(toIndex, 0, movedImage);

  newGroups[categoryIndex] = {
    ...group,
    images: newImages
  };

  return {
    ...organized,
    groups: newGroups
  };
}

/**
 * Move image between categories
 */
export function moveImageBetweenCategories(
  organized: OrganizedCategories,
  fromCategoryIndex: number,
  imageIndex: number,
  toCategoryIndex: number
): OrganizedCategories {
  const newGroups = [...organized.groups];

  const fromGroup = newGroups[fromCategoryIndex];
  const toGroup = newGroups[toCategoryIndex];

  if (!fromGroup || !toGroup) {
    return organized;
  }

  const newFromImages = [...fromGroup.images];
  const [movedImage] = newFromImages.splice(imageIndex, 1);

  // Update the image's classification to match new category
  const updatedImage: ProcessedImage = {
    ...movedImage,
    classification: {
      ...movedImage.classification!,
      category: toGroup.category
    }
  };

  const newToImages = [...toGroup.images, updatedImage];

  newGroups[fromCategoryIndex] = {
    ...fromGroup,
    images: newFromImages
  };

  newGroups[toCategoryIndex] = {
    ...toGroup,
    images: newToImages,
    avgConfidence:
      newToImages.reduce(
        (sum, img) => sum + (img.classification?.confidence || 0),
        0
      ) / newToImages.length
  };

  // Remove empty groups
  const filteredGroups = newGroups.filter((group) => group.images.length > 0);

  return {
    ...organized,
    groups: filteredGroups,
    categoryCount: filteredGroups.length
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get summary statistics for organized categories
 */
export function getCategorySummary(organized: OrganizedCategories) {
  const groupCounts = countImagesByGroup(organized);

  return {
    total: organized.totalImages,
    categories: organized.categoryCount,
    byGroup: groupCounts,
    avgImagesPerCategory:
      organized.categoryCount > 0
        ? organized.totalImages / organized.categoryCount
        : 0
  };
}

/**
 * Export categorization for saving
 */
export function exportCategorization(organized: OrganizedCategories) {
  return organized.groups.map((group) => ({
    category: group.category,
    displayLabel: group.displayLabel,
    roomNumber: group.roomNumber,
    imageIds: group.images.map((img) => img.id),
    imageCount: group.images.length,
    avgConfidence: group.avgConfidence
  }));
}
