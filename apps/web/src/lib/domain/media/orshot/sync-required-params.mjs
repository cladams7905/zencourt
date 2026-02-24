#!/usr/bin/env node
/**
 * Fetches template modifications from Orshot API and updates templates.json requiredParams.
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
      apiMap.set(id, getRequiredParams(t.modifications));
    }

    const updated = templates.map((t) => ({
      ...t,
      requiredParams: apiMap.get(t.id) ?? []
    }));

    writeFileSync(
      TEMPLATES_JSON,
      JSON.stringify(updated, null, 2) + "\n",
      "utf8"
    );
    console.error(
      "Updated %s with requiredParams from Orshot API.",
      TEMPLATES_JSON
    );
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
