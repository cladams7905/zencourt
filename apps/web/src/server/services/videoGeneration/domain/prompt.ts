import type {
  CameraMotionVariantId,
  ImagePerspective
} from "@shared/types/models";
import {
  getIsExterior,
  getMotionTemplates,
  normalizeMotionVariantId
} from "@web/src/lib/domain/videoGeneration/cameraMotionOptions";

const PROMPT_CONSTRAINTS =
  "No people. No added objects. Keep architecture and materials unchanged. No scene changes. No added transitions. Single continuous camera movement at a fixed speed only.";

type PromptTemplate = {
  key: string;
  template: string;
};

type PromptTemplatePicker = (templates: PromptTemplate[]) => PromptTemplate;

export {
  getAvailableMotionVariants,
  normalizeMotionVariantId
} from "@web/src/lib/domain/videoGeneration/cameraMotionOptions";

function pickPromptTemplate(args: {
  category: string;
  isExterior: boolean;
  perspective?: ImagePerspective;
  motionVariantId?: CameraMotionVariantId;
  previousTemplateKey?: string | null;
  picker?: PromptTemplatePicker;
}): PromptTemplate {
  const {
    isExterior,
    perspective,
    motionVariantId,
    previousTemplateKey,
    picker
  } = args;
  const pool = getMotionTemplates({ isExterior, perspective });

  if (motionVariantId && motionVariantId !== "default") {
    const explicitTemplate = pool.find(
      (template) => template.motionVariantId === motionVariantId
    );
    if (explicitTemplate) {
      return explicitTemplate;
    }
  }

  if (pool.length === 1) {
    return pool[0];
  }

  const filtered = previousTemplateKey
    ? pool.filter((item) => item.key !== previousTemplateKey)
    : pool;

  const pickFrom = filtered.length > 0 ? filtered : pool;
  const selectTemplate: PromptTemplatePicker =
    picker ??
    ((templates) => templates[Math.floor(Math.random() * templates.length)]);
  return selectTemplate(pickFrom);
}

export function buildPrompt(args: {
  roomName: string;
  category: string;
  perspective?: ImagePerspective;
  motionVariantId?: CameraMotionVariantId;
  previousTemplateKey?: string | null;
  picker?: PromptTemplatePicker;
}): { prompt: string; templateKey: string } {
  const {
    roomName,
    category,
    perspective,
    motionVariantId,
    previousTemplateKey,
    picker
  } = args;

  const baseCategory = category.replace(/-\d+$/, "");
  const isExterior = getIsExterior(baseCategory);
  const resolvedMotionVariantId = normalizeMotionVariantId(
    baseCategory,
    perspective,
    motionVariantId
  );

  const promptInfo = pickPromptTemplate({
    category: baseCategory,
    isExterior,
    perspective,
    motionVariantId: resolvedMotionVariantId,
    previousTemplateKey,
    picker
  });

  const displayRoomName =
    baseCategory === "exterior-front"
      ? "front of the house"
      : baseCategory === "exterior-backyard"
        ? "back of the house"
        : roomName;

  const motionPrompt = promptInfo.template
    .replace(/\{roomName\}/g, displayRoomName)
    .trim();

  return {
    prompt: motionPrompt,
    templateKey: promptInfo.key
  };
}

export function buildNegativePrompt(): string {
  return PROMPT_CONSTRAINTS;
}

export function combinePromptPartsForProvider(args: {
  prompt: string;
  negativePrompt?: string | null;
}): string {
  const normalizedPrompt = args.prompt.trim();
  const normalizedNegativePrompt = args.negativePrompt?.trim() ?? "";

  return [normalizedPrompt, normalizedNegativePrompt].filter(Boolean).join(" ");
}

export function stripProviderPromptConstraints(prompt: string): string {
  const normalizedPrompt = prompt.trim();
  const suffix = ` ${PROMPT_CONSTRAINTS}`;

  if (normalizedPrompt.endsWith(suffix)) {
    return normalizedPrompt.slice(0, -suffix.length).trim();
  }

  if (normalizedPrompt === PROMPT_CONSTRAINTS) {
    return "";
  }

  return normalizedPrompt;
}
