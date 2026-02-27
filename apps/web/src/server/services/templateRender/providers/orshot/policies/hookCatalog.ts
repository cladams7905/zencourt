import { readFileSync } from "fs";
import { existsSync } from "fs";
import { join } from "path";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { TemplateHeaderLength } from "@web/src/lib/domain/media/templateRender/types";

export type HeaderHook = {
  header: string;
  subheader: string;
};

type HookLength = Extract<TemplateHeaderLength, "short" | "medium">;

const HOOK_FILE_BY_SUBCATEGORY: Record<
  ListingContentSubcategory,
  Partial<Record<HookLength, string>>
> = {
  new_listing: {
    short: "new-listing-short.md",
    medium: "new-listing-medium.md"
  },
  open_house: {
    short: "open-house-short.md",
    medium: "open-house-medium.md"
  },
  price_change: {
    short: "price-change-short.md",
    medium: "price-change-medium.md"
  },
  status_update: {
    short: "status-update-short.md",
    medium: "status-update-medium.md"
  },
  property_features: {}
};

const HOOKS_BASE_DIR_CANDIDATES = [
  ["apps", "web", "src", "lib", "ai", "prompts", "content", "listings", "hooks"],
  ["src", "lib", "ai", "prompts", "content", "listings", "hooks"]
];

const hookCache = new Map<string, HeaderHook[]>();

function parseHookLine(rawLine: string): HeaderHook | null {
  const withoutIndex = rawLine.replace(/^\s*\d+\.\s*/, "").trim();
  if (!withoutIndex) {
    return null;
  }

  const [headerRaw, ...subheaderParts] = withoutIndex.split("—");
  const header = headerRaw?.trim() ?? "";
  if (!header) {
    return null;
  }

  return {
    header,
    subheader: subheaderParts.join("—").trim()
  };
}

function resolveHooksFilePath(filename: string): string | null {
  for (const segments of HOOKS_BASE_DIR_CANDIDATES) {
    const candidate = join(process.cwd(), ...segments, filename);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function loadHooksFromFile(filename: string): HeaderHook[] {
  if (hookCache.has(filename)) {
    return hookCache.get(filename) as HeaderHook[];
  }

  const path = resolveHooksFilePath(filename);
  if (!path) {
    hookCache.set(filename, []);
    return [];
  }

  const hooks = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map(parseHookLine)
    .filter((hook): hook is HeaderHook => Boolean(hook));

  hookCache.set(filename, hooks);
  return hooks;
}

export function getHeaderHooks(params: {
  subcategory: ListingContentSubcategory;
  headerLength: TemplateHeaderLength;
}): HeaderHook[] {
  if (params.headerLength !== "short" && params.headerLength !== "medium") {
    return [];
  }
  const filename = HOOK_FILE_BY_SUBCATEGORY[params.subcategory]?.[params.headerLength];
  if (!filename) {
    return [];
  }
  return loadHooksFromFile(filename);
}
