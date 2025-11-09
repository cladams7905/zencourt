"use client";

import { useCallback } from "react";
import type { ProcessedImage } from "../types/images";
import {
  type CategorizedGroup,
  ROOM_CATEGORIES,
  type RoomCategory
} from "@web/src/types/vision";

interface CategorizationOptions {
  minConfidence?: number;
  moveLowConfidenceToOther?: boolean;
  lowConfidenceThreshold?: number;
}

export interface CategorizationResult {
  groups: CategorizedGroup[];
  totalImages: number;
  categoryCount: number;
  byCategory: Record<string, ProcessedImage[]>;
}

const LOG_PREFIX = "[useCategorization]";

export function useCategorization() {
  const categorizeImages = useCallback(
    (
      images: ProcessedImage[],
      options: CategorizationOptions = {}
    ): CategorizationResult => {
      log("Starting categorization", { totalImages: images.length, options });

      const groupedByCategory = groupImagesByCategory(images, options);
      log("Grouped images", {
        categories: Object.keys(groupedByCategory).length
      });

      const groups = buildCategorizedGroups(groupedByCategory);
      log("Built categorized groups", { groups: groups.length });

      const totalImages = images.filter((img) => img.classification).length;
      const categoryCount = Object.keys(groupedByCategory).length;

      const result: CategorizationResult = {
        groups,
        totalImages,
        categoryCount,
        byCategory: groupedByCategory
      };

      log("Categorization complete", {
        totalImages,
        categoryCount,
        groupCount: groups.length
      });

      return result;
    },
    []
  );

  return { categorizeImages };
}

function groupImagesByCategory(
  images: ProcessedImage[],
  options: CategorizationOptions
): Record<string, ProcessedImage[]> {
  const {
    minConfidence = 0,
    moveLowConfidenceToOther = true,
    lowConfidenceThreshold = 0.5
  } = options;

  return images.reduce<Record<string, ProcessedImage[]>>((acc, image) => {
    const classification = image.classification;
    if (!classification) {
      return acc;
    }

    const confidence = classification.confidence;
    if (confidence < minConfidence) {
      return acc;
    }

    let category = classification.category;
    if (
      moveLowConfidenceToOther &&
      confidence < lowConfidenceThreshold &&
      category !== "other"
    ) {
      category = "other";
    }

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(image);
    return acc;
  }, {});
}

function buildCategorizedGroups(
  groupedByCategory: Record<string, ProcessedImage[]>
): CategorizedGroup[] {
  const groups: CategorizedGroup[] = [];

  Object.entries(groupedByCategory).forEach(([category, images]) => {
    const metadata = ROOM_CATEGORIES[category as RoomCategory];

    if (!metadata) {
      log("Encountered unknown category", { category });
      return;
    }

    const avgConfidence =
      images.reduce(
        (sum, img) => sum + (img.classification?.confidence || 0),
        0
      ) / images.length;

    if (metadata.allowNumbering && images.length > 1) {
      images.forEach((image, index) => {
        const roomNumber = index + 1;
        groups.push({
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
      groups.push({
        category: category as RoomCategory,
        displayLabel: metadata.label,
        baseLabel: metadata.label,
        metadata,
        images,
        avgConfidence
      });
    }
  });

  groups.sort((a, b) => {
    if (a.metadata.order !== b.metadata.order) {
      return a.metadata.order - b.metadata.order;
    }

    if (a.roomNumber && b.roomNumber) {
      return a.roomNumber - b.roomNumber;
    }

    return 0;
  });

  return groups;
}

function log(message: string, data?: Record<string, unknown>) {
  if (data) {
    console.log(`${LOG_PREFIX} ${message}`, data);
  } else {
    console.log(`${LOG_PREFIX} ${message}`);
  }
}
