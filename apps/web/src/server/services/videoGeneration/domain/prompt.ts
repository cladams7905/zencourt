import {
  ROOM_CATEGORIES,
  RoomCategory
} from "@web/src/lib/domain/listings/media/roomCategories";

const PROMPT_CONSTRAINTS =
  "No people. No added objects. Keep architecture and materials unchanged. Single continuous camera movement only. Full-bleed, edge-to-edge composition from the first frame, filling the entire video frame at all times. Start already full-screen. No framed or inset opening, no letterboxing or pillarboxing, and no fades, transitions, cuts, or scene changes.";

type PromptTemplate = {
  key: string;
  template: string;
};

type PromptTemplatePicker = (templates: PromptTemplate[]) => PromptTemplate;

function normalizeAiDirections(aiDirections?: string): string | null {
  const normalized = aiDirections?.trim();
  return normalized ? normalized : null;
}

const INTERIOR_TEMPLATES: PromptTemplate[] = [
  {
    key: "interior-forward-pan",
    template: "Forward pan through the {roomName}."
  },
  {
    key: "interior-lateral-track",
    template: "Steady lateral tracking shot across the {roomName}."
  },
  {
    key: "interior-straight-glide",
    template: "Straight-on glide through the {roomName}."
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
  },
  {
    key: "exterior-aerial-sweep",
    template: "Aerial sweep across the {roomName}, wide cinematic movement."
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
    template: "Steady pan around the {roomName}."
  }
];

const CATEGORY_TEMPLATES: Partial<Record<RoomCategory, PromptTemplate[]>> = {
  bathroom: [
    {
      key: "bathroom-slow-glide",
      template: "Slow glide across the {roomName}."
    }
  ],
  bedroom: [
    {
      key: "bedroom-lateral-track",
      template: "Steady lateral camera move across the {roomName}."
    }
  ]
};

function pickPromptTemplate(args: {
  category: string;
  isExterior: boolean;
  perspective?: "aerial" | "ground";
  previousTemplateKey?: string | null;
  picker?: PromptTemplatePicker;
}): PromptTemplate {
  const { category, isExterior, perspective, previousTemplateKey, picker } =
    args;
  const baseTemplates = isExterior
    ? perspective === "ground"
      ? EXTERIOR_GROUND_TEMPLATES
      : EXTERIOR_AERIAL_TEMPLATES
    : INTERIOR_TEMPLATES;
  const overrides = CATEGORY_TEMPLATES[category as RoomCategory] ?? undefined;
  const pool = overrides ? [...overrides, ...baseTemplates] : baseTemplates;

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
  aiDirections?: string;
  perspective?: "aerial" | "ground";
  previousTemplateKey?: string | null;
  picker?: PromptTemplatePicker;
}): { prompt: string; templateKey: string } {
  const {
    roomName,
    category,
    aiDirections,
    perspective,
    previousTemplateKey,
    picker
  } = args;

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
  const directionPrompt = normalizeAiDirections(aiDirections);

  return {
    prompt: [motionPrompt, directionPrompt, PROMPT_CONSTRAINTS]
      .filter(Boolean)
      .join(" "),
    templateKey: promptInfo.key
  };
}
