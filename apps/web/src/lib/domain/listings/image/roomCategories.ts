import type {
  ImagePerspective,
  ListingImageAiScores,
  ListingImageShotType
} from "@shared/types/models";
import { ProcessedImage } from "./types";

export type RoomCategory =
  | "exterior-front"
  | "exterior-back"
  | "living-room"
  | "kitchen"
  | "dining-room"
  | "master-bedroom"
  | "bedroom"
  | "bathroom"
  | "garage"
  | "office"
  | "laundry-room"
  | "basement"
  | "other";

export interface RoomClassification {
  category: RoomCategory;
  confidence: number;
  shotType: ListingImageShotType;
  featureTags: string[];
  scores: ListingImageAiScores;
  perspective?: ImagePerspective;
}

export interface BatchClassificationResult {
  imageUrl: string;
  success: boolean;
  classification: RoomClassification | null;
  error: string | null;
  duration: number;
}

export type BatchProgressCallback = (
  completed: number,
  total: number,
  result: BatchClassificationResult
) => void;

/**
 * Category metadata for display and organization
 */
export interface RoomCategoryMetadata {
  /** Internal category ID */
  id: RoomCategory;
  /** Display label */
  label: string;
  /** Lucide icon name */
  icon: string;
  /** Display order (lower = first) */
  order: number;
  /** Category color for UI */
  color: string;
  /** Whether this category should be numbered when duplicates exist */
  allowNumbering: boolean;
  /** Category group for organization */
  group: "exterior" | "living" | "private" | "utility" | "other";
}

/**
 * A category with its images and display metadata
 */
export interface CategorizedGroup {
  /** Category ID */
  category: RoomCategory;
  /** Display label (may include numbering, e.g., "Bedroom 1") */
  displayLabel: string;
  /** Original category label */
  baseLabel: string;
  /** Room number (if applicable, e.g., 1, 2, 3) */
  roomNumber?: number;
  /** Category metadata */
  metadata: RoomCategoryMetadata;
  /** Images in this category */
  images: ProcessedImage[];
  /** Average confidence of classifications */
  avgConfidence: number;
}

/**
 * Complete room categories configuration
 * Ordered logically for property walkthroughs
 */
export const ROOM_CATEGORIES: Record<RoomCategory, RoomCategoryMetadata> = {
  "exterior-front": {
    id: "exterior-front",
    label: "Exterior (Front)",
    icon: "Home",
    order: 1,
    color: "#10b981", // green-500
    allowNumbering: false,
    group: "exterior"
  },
  "exterior-back": {
    id: "exterior-back",
    label: "Exterior (Back)",
    icon: "Trees",
    order: 2,
    color: "#059669", // green-600
    allowNumbering: false,
    group: "exterior"
  },
  "living-room": {
    id: "living-room",
    label: "Living Room",
    icon: "Sofa",
    order: 3,
    color: "#3b82f6", // blue-500
    allowNumbering: false,
    group: "living"
  },
  "dining-room": {
    id: "dining-room",
    label: "Dining Room",
    icon: "Utensils",
    order: 4,
    color: "#8b5cf6", // violet-500
    allowNumbering: false,
    group: "living"
  },
  kitchen: {
    id: "kitchen",
    label: "Kitchen",
    icon: "ChefHat",
    order: 5,
    color: "#f59e0b", // amber-500
    allowNumbering: false,
    group: "living"
  },
  "master-bedroom": {
    id: "master-bedroom",
    label: "Master Bedroom",
    icon: "BedDouble",
    order: 6,
    color: "#db2777",
    allowNumbering: false,
    group: "private"
  },
  bedroom: {
    id: "bedroom",
    label: "Bedroom",
    icon: "Bed",
    order: 7,
    color: "#ec4899", // pink-500
    allowNumbering: true,
    group: "private"
  },
  bathroom: {
    id: "bathroom",
    label: "Bathroom",
    icon: "Bath",
    order: 8,
    color: "#06b6d4", // cyan-500
    allowNumbering: true,
    group: "private"
  },
  office: {
    id: "office",
    label: "Office",
    icon: "Briefcase",
    order: 9,
    color: "#14b8a6", // teal-500
    allowNumbering: true,
    group: "private"
  },
  "laundry-room": {
    id: "laundry-room",
    label: "Laundry Room",
    icon: "WashingMachine",
    order: 10,
    color: "#a855f7", // purple-500
    allowNumbering: false,
    group: "utility"
  },
  garage: {
    id: "garage",
    label: "Garage",
    icon: "Car",
    order: 11,
    color: "#6366f1", // indigo-500
    allowNumbering: true,
    group: "utility"
  },
  basement: {
    id: "basement",
    label: "Basement",
    icon: "Warehouse",
    order: 12,
    color: "#64748b", // slate-500
    allowNumbering: false,
    group: "utility"
  },
  other: {
    id: "other",
    label: "Other",
    icon: "MoreHorizontal",
    order: 13,
    color: "#94a3b8", // slate-400
    allowNumbering: false,
    group: "other"
  }
};
