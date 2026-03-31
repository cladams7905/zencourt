import {
  ROOM_CATEGORIES,
  RoomCategory
} from "@web/src/lib/domain/listings/image/roomCategories";

const PROMPT_CONSTRAINTS =
  "No people. No added objects. Keep architecture and materials unchanged. No scene changes. No added transitions. Single continuous camera movement at a fixed speed only.";

type PromptTemplate = {
  key: string;
  template: string;
};

type PromptTemplatePicker = (templates: PromptTemplate[]) => PromptTemplate;

const INTERIOR_TEMPLATES: PromptTemplate[] = [
  {
    key: "interior-forward-pan",
    template: "Slow forward pan through the {roomName}."
  },
  {
    key: "interior-lateral-track",
    template: "Steady lateral tracking shot across the {roomName}."
  },
  {
    key: "interior-orbital-track",
    template: "Smooth orbital pan around the {roomName}."
  }
];

const EXTERIOR_AERIAL_TEMPLATES: PromptTemplate[] = [
  {
    key: "exterior-aerial-flyover",
    template:
      "Aerial flyover of the {roomName}, gliding forward above the property."
  },
  {
    key: "exterior-aerial-orbit",
    template: "Smooth orbit around the {roomName}, aerial perspective."
  },
  {
    key: "exterior-aerial-descend",
    template: "Descending aerial shot toward the {roomName}."
  }
];

const EXTERIOR_GROUND_TEMPLATES: PromptTemplate[] = [
  {
    key: "exterior-ground-approach",
    template: "Steady approach toward the {roomName}."
  },
  {
    key: "exterior-ground-lateral",
    template: "Lateral tracking pan across the {roomName}."
  },
  {
    key: "exterior-ground-orbit",
    template: "Steady orbital pan around the {roomName}."
  }
];

function pickPromptTemplate(args: {
  category: string;
  isExterior: boolean;
  perspective?: "aerial" | "ground";
  previousTemplateKey?: string | null;
  picker?: PromptTemplatePicker;
}): PromptTemplate {
  const { isExterior, perspective, previousTemplateKey, picker } = args;
  const pool = isExterior
    ? perspective === "ground"
      ? EXTERIOR_GROUND_TEMPLATES
      : EXTERIOR_AERIAL_TEMPLATES
    : INTERIOR_TEMPLATES;

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
  perspective?: "aerial" | "ground";
  previousTemplateKey?: string | null;
  picker?: PromptTemplatePicker;
}): { prompt: string; templateKey: string } {
  const { roomName, category, perspective, previousTemplateKey, picker } = args;

  const baseCategory = category.replace(/-\d+$/, "");
  const metadata = ROOM_CATEGORIES[baseCategory as RoomCategory];
  const isExterior = metadata?.group === "exterior";

  const promptInfo = pickPromptTemplate({
    category: baseCategory,
    isExterior,
    perspective,
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
