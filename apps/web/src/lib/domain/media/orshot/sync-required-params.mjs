#!/usr/bin/env node
/**
 * Fetches template metadata from Orshot API and updates templates.json.
 * Usage: ORSHOT_API_KEY=your_key node sync-required-params.mjs
 * Run from repo root or apps/web.
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_JSON = join(__dirname, "templates.json");

// Must match TEMPLATE_RENDER_PARAMETER_KEYS in templateRender/types.ts
const VALID_KEYS = new Set([
  "headerText",
  "headerTag",
  "headerTextTop",
  "headerTextBottom",
  "subheader1Text",
  "subheader2Text",
  "arrowImage",
  "bedCount",
  "bathCount",
  "garageCount",
  "squareFootage",
  "listingPrice",
  "priceLabel",
  "priceDescription",
  "propertyDescription",
  "backgroundImage1",
  "backgroundImage2",
  "backgroundImage3",
  "backgroundImage4",
  "backgroundImage5",
  "listingAddress",
  "feature1",
  "feature2",
  "feature3",
  "featureList",
  "openHouseDateTime",
  "socialHandle",
  "realtorName",
  "realtorProfileImage",
  "realtorContactInfo",
  "realtorContact1",
  "realtorContact2",
  "realtorContact3"
]);

function getRequiredParams(modifications) {
  if (!Array.isArray(modifications)) return [];
  return modifications
    .map((m) => m?.key)
    .filter((key) => typeof key === "string" && VALID_KEYS.has(key));
}

function getThumbnailUrl(template) {
  const topLevel = template?.thumbnail_url;
  if (typeof topLevel === "string" && topLevel.trim().length > 0) {
    return topLevel.trim();
  }

  if (Array.isArray(template?.pages_data)) {
    for (const page of template.pages_data) {
      const pageThumbnail = page?.thumbnail_url;
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
    const apiMap = new Map();
    for (const t of apiTemplates) {
      const id = String(t.id);
      apiMap.set(id, {
        requiredParams: getRequiredParams(t.modifications),
        thumbnail_url: getThumbnailUrl(t)
      });
    }

    let matchedCount = 0;
    let thumbnailCount = 0;
    const updated = templates.map((t) => {
      const apiTemplate = apiMap.get(String(t.id));
      if (apiTemplate) {
        matchedCount += 1;
      }
      if (apiTemplate?.thumbnail_url) {
        thumbnailCount += 1;
      }
      return {
        ...t,
        requiredParams: apiTemplate?.requiredParams ?? [],
        thumbnail_url: apiTemplate?.thumbnail_url ?? ""
      };
    });

    writeFileSync(
      TEMPLATES_JSON,
      JSON.stringify(updated, null, 2) + "\n",
      "utf8"
    );
    console.error(
      "Updated %s with requiredParams and thumbnail_url from Orshot API.",
      TEMPLATES_JSON
    );
    console.error(
      "Template matches: %d/%d. Templates with thumbnail_url: %d.",
      matchedCount,
      templates.length,
      thumbnailCount
    );
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
