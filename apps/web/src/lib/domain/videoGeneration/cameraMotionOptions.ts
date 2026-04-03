import {
  ROOM_CATEGORIES,
  type RoomCategory
} from "@web/src/lib/domain/listings/image/roomCategories";
import type {
  CameraMotionVariantId,
  ImagePerspective
} from "@shared/types/models";

type PromptTemplate = {
  key: string;
  template: string;
};

export type MotionVariantOption = {
  id: CameraMotionVariantId;
  label: string;
  description: string;
};

export type MotionTemplate = PromptTemplate & {
  motionVariantId: Exclude<CameraMotionVariantId, "default">;
};

const DEFAULT_MOTION_OPTION: MotionVariantOption = {
  id: "default",
  label: "Default",
  description: "Let the system pick a camera move that fits this room."
};

const INTERIOR_TEMPLATES: MotionTemplate[] = [
  {
    motionVariantId: "pan",
    key: "interior-forward-pan",
    template: "Slow forward pan through the {roomName}."
  },
  {
    motionVariantId: "tracking",
    key: "interior-lateral-track",
    template: "Steady lateral tracking shot across the {roomName}."
  },
  {
    motionVariantId: "orbital",
    key: "interior-orbital-track",
    template: "Smooth orbital pan around the {roomName}."
  },
  {
    motionVariantId: "blur-to-focus",
    key: "interior-rack-focus",
    template:
      "Create a cinematic rack-focus glide through the {roomName}. Start with a soft blurred foreground element close to the camera and bring the room into sharp focus. If the source image has no natural foreground occlusion, introduce only a subtle out-of-focus foreground edge or object near the lens to motivate the blur while keeping the room layout, architecture, and materials unchanged."
  }
];

const EXTERIOR_AERIAL_TEMPLATES: MotionTemplate[] = [
  {
    motionVariantId: "tracking",
    key: "exterior-aerial-flyover",
    template:
      "Aerial flyover of the {roomName}, gliding forward above the property."
  },
  {
    motionVariantId: "orbital",
    key: "exterior-aerial-orbit",
    template: "Smooth orbit around the {roomName}, aerial perspective."
  },
  {
    motionVariantId: "pan",
    key: "exterior-aerial-descend",
    template: "Descending aerial shot toward the {roomName}."
  }
];

const EXTERIOR_GROUND_TEMPLATES: MotionTemplate[] = [
  {
    motionVariantId: "tracking",
    key: "exterior-ground-approach",
    template: "Steady approach toward the {roomName}."
  },
  {
    motionVariantId: "pan",
    key: "exterior-ground-lateral",
    template: "Lateral tracking pan across the {roomName}."
  },
  {
    motionVariantId: "orbital",
    key: "exterior-ground-orbit",
    template: "Steady orbital pan around the {roomName}."
  }
];

const MOTION_VARIANT_LABELS: Record<CameraMotionVariantId, string> = {
  default: "Default",
  pan: "Pan",
  tracking: "Tracking",
  orbital: "Orbital",
  "blur-to-focus": "Blur to Focus"
};

const MOTION_VARIANT_DESCRIPTIONS: Record<CameraMotionVariantId, string> = {
  default: "Let the system pick a camera move that fits this room.",
  pan: "A smooth directional sweep that glides through the space.",
  tracking: "A steady lateral move that follows the room from side to side.",
  orbital: "A gentle curved move that wraps around the focal point.",
  "blur-to-focus":
    "Push past a blurred foreground object to reveal the room behind it."
};

/** Used by server prompt builder; shared so template pools stay in sync with UI options. */
export function getMotionTemplates(args: {
  isExterior: boolean;
  perspective?: ImagePerspective;
}): MotionTemplate[] {
  const { isExterior, perspective } = args;

  if (!isExterior) {
    return INTERIOR_TEMPLATES;
  }

  return perspective === "ground"
    ? EXTERIOR_GROUND_TEMPLATES
    : EXTERIOR_AERIAL_TEMPLATES;
}

export function getIsExterior(category: string): boolean {
  const metadata = ROOM_CATEGORIES[category as RoomCategory];
  return metadata?.group === "exterior";
}

export function getAvailableMotionVariants(
  category: string,
  perspective?: ImagePerspective
): MotionVariantOption[] {
  const baseCategory = category.replace(/-\d+$/, "");
  const isExterior = getIsExterior(baseCategory);
  const templates = getMotionTemplates({ isExterior, perspective });
  const variantIds = Array.from(
    new Set(templates.map((template) => template.motionVariantId))
  );

  return [
    DEFAULT_MOTION_OPTION,
    ...variantIds.map((id) => ({
      id,
      label: MOTION_VARIANT_LABELS[id],
      description: MOTION_VARIANT_DESCRIPTIONS[id]
    }))
  ];
}

export function normalizeMotionVariantId(
  category: string,
  perspective: ImagePerspective | undefined,
  motionVariantId: CameraMotionVariantId | null | undefined
): CameraMotionVariantId {
  if (!motionVariantId) {
    return "default";
  }

  const allowed = new Set(
    getAvailableMotionVariants(category, perspective).map((option) => option.id)
  );

  return allowed.has(motionVariantId) ? motionVariantId : "default";
}
