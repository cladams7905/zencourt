#!/usr/bin/env node
/**
 * Fetches template metadata from Orshot API and updates templates.json.
 * Usage: ORSHOT_API_KEY=your_key node sync-templates.mjs
 * Run from repo root or apps/web.
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_JSON = join(__dirname, "templates.json");
const TEMPLATE_RENDER_TYPES = join(__dirname, "../templateRender/types.ts");

function loadTemplateRenderParameterKeys() {
  const source = readFileSync(TEMPLATE_RENDER_TYPES, "utf8");
  const match = source.match(
    /export const TEMPLATE_RENDER_PARAMETER_KEYS = \[([\s\S]*?)\] as const;/
  );
  if (!match || typeof match[1] !== "string") {
    throw new Error(
      "Failed to load TEMPLATE_RENDER_PARAMETER_KEYS from templateRender/types.ts"
    );
  }

  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const VALID_KEYS = new Set(loadTemplateRenderParameterKeys());

function normalizeModificationKey(key) {
  if (typeof key !== "string") return key;
  return key.replace(/^page\d+@/, "");
}

function getRequiredParams(modifications) {
  if (!Array.isArray(modifications)) return [];
  return modifications
    .map((m) => normalizeModificationKey(m?.key))
    .filter((key) => typeof key === "string" && VALID_KEYS.has(key));
}

function getPageLength(template) {
  const pagesData = template?.pages_data;
  if (!Array.isArray(pagesData)) {
    return 1;
  }
  return Math.max(1, pagesData.length);
}

function getTemplateName(template) {
  const name = template?.name;
  if (typeof name !== "string") {
    return "";
  }
  return name.trim();
}

function getThumbnailUrl(template) {
  const topLevel = template?.thumbnail_url ?? template?.thumbnailUrl;
  if (typeof topLevel === "string" && topLevel.trim().length > 0) {
    return topLevel.trim();
  }

  if (Array.isArray(template?.pages_data)) {
    for (const page of template.pages_data) {
      const pageThumbnail = page?.thumbnail_url ?? page?.thumbnailUrl;
      if (
        typeof pageThumbnail === "string" &&
        pageThumbnail.trim().length > 0
      ) {
        return pageThumbnail.trim();
      }
    }
  }

  return "";
}

async function fetchAllTemplates(apiKey) {
  const baseUrl = "https://api.orshot.com/v1/studio/templates/all";
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const all = [];

  do {
    const url = `${baseUrl}?page=${page}&limit=${limit}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Orshot API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const data = json.data;
    const pagination = json.pagination;

    if (data == null || !Array.isArray(data)) {
      console.error(
        "No data in response (page %d). Check API key and response.",
        page
      );
      console.error(JSON.stringify(json, null, 2));
      process.exit(1);
    }

    totalPages = pagination?.totalPages ?? 1;
    all.push(...data);
    console.error("Fetched page %d of %d", page, totalPages);

    if (page >= totalPages) break;
    page += 1;
  } while (true);

  return all;
}

async function main() {
  const apiKey = process.env.ORSHOT_API_KEY?.trim();
  if (!apiKey) {
    console.error("ORSHOT_API_KEY is not set. Set it and run again.");
    process.exit(1);
  }

  let templates;
  try {
    templates = JSON.parse(readFileSync(TEMPLATES_JSON, "utf8"));
  } catch (err) {
    console.error("Failed to read %s: %s", TEMPLATES_JSON, err.message);
    process.exit(1);
  }

  if (!Array.isArray(templates)) {
    console.error("templates.json must be a JSON array.");
    process.exit(1);
  }

  try {
    const apiTemplates = await fetchAllTemplates(apiKey);

    // Collect all modification keys from API that are NOT in VALID_KEYS
    const keysNotInValidSet = new Map(); // key -> Map<id, { id, name }>
    for (const t of apiTemplates) {
      const mods = t?.modifications;
      if (!Array.isArray(mods)) continue;
      const id = String(t.id);
      const name = typeof t?.name === "string" ? t.name : "";
      for (const m of mods) {
        const key = normalizeModificationKey(m?.key);
        if (typeof key !== "string") continue;
        if (VALID_KEYS.has(key)) continue;
        if (!keysNotInValidSet.has(key)) {
          keysNotInValidSet.set(key, new Map());
        }
        keysNotInValidSet.get(key).set(id, { id, name });
      }
    }
    const sortedUnknownKeys = [...keysNotInValidSet.keys()].sort();
    if (sortedUnknownKeys.length > 0) {
      console.warn(
        "⚠️  Modification keys from API not in VALID_KEYS (%d unique):\n%s",
        sortedUnknownKeys.length,
        JSON.stringify(
          Object.fromEntries(
            sortedUnknownKeys.map((k) => [
              k,
              [...keysNotInValidSet.get(k).values()].sort(
                (a, b) => Number(a.id) - Number(b.id)
              )
            ])
          ),
          null,
          2
        )
      );
    }

    const apiMap = new Map();
    for (const t of apiTemplates) {
      const id = String(t.id);
      apiMap.set(id, {
        name: getTemplateName(t),
        requiredParams: getRequiredParams(t.modifications),
        thumbnailUrl: getThumbnailUrl(t),
        pageLength: getPageLength(t)
      });
    }

    let syncedCount = 0;
    const updated = templates.map((t) => {
      const apiTemplate = apiMap.get(String(t.id));
      const nextTemplate = {
        ...t,
        name: apiTemplate?.name ?? t.name ?? "",
        requiredParams: apiTemplate?.requiredParams ?? [],
        thumbnailUrl: apiTemplate?.thumbnailUrl ?? "",
        pageLength: apiTemplate?.pageLength ?? 1,
        headerLength: t.headerLength ?? "medium"
      };
      if (JSON.stringify(nextTemplate) !== JSON.stringify(t)) {
        syncedCount += 1;
      }
      return nextTemplate;
    });

    writeFileSync(
      TEMPLATES_JSON,
      JSON.stringify(updated, null, 2) + "\n",
      "utf8"
    );
    console.log("Synced %d templates.", syncedCount);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
