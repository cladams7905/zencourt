#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");

const summaryPath = path.resolve(webRoot, "coverage/coverage-summary.json");
const finalPath = path.resolve(webRoot, "coverage/coverage-final.json");
if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}`);
  process.exit(1);
}
if (fs.existsSync(finalPath)) {
  const summaryMtimeMs = fs.statSync(summaryPath).mtimeMs;
  const finalMtimeMs = fs.statSync(finalPath).mtimeMs;
  const STALE_TOLERANCE_MS = 2000;
  if (summaryMtimeMs + STALE_TOLERANCE_MS < finalMtimeMs) {
    console.error(
      [
        "Coverage summary appears stale.",
        `coverage-summary.json (${new Date(summaryMtimeMs).toISOString()})`,
        `is older than coverage-final.json (${new Date(finalMtimeMs).toISOString()}).`,
        "Re-run coverage so json-summary is regenerated before check-coverage."
      ].join(" ")
    );
    process.exit(1);
  }
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const THRESHOLDS = {
  statements: 80,
  lines: 80,
  functions: 80,
  branches: 70
};

function subfolderPrefixes(root, srcRelative) {
  return fs
    .readdirSync(path.resolve(webRoot, root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${srcRelative}/${entry.name}/`)
    .sort();
}

function componentPrefixesWithDomain() {
  const componentsRoot = path.resolve(webRoot, "src/components");
  return fs
    .readdirSync(componentsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) =>
      fs.existsSync(path.join(componentsRoot, entry.name, "domain"))
    )
    .map((entry) => `src/components/${entry.name}/domain/`)
    .sort();
}

function apiRoutePrefixes(root, srcRelative) {
  const rootPath = path.resolve(webRoot, root);
  const prefixes = new Set([`${srcRelative}/`]);

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === "route.ts") {
        const relativeDir = path
          .relative(rootPath, path.dirname(fullPath))
          .split(path.sep)
          .join("/");
        if (relativeDir) {
          prefixes.add(`${srcRelative}/${relativeDir}/`);
        }
      }
    }
  }

  if (fs.existsSync(rootPath)) {
    walk(rootPath);
  }

  return [...prefixes].sort();
}

const MODULE_PREFIXES = [
  ...componentPrefixesWithDomain(),
  ...subfolderPrefixes("src/server/services", "src/server/services"),
  ...apiRoutePrefixes("src/app/api/v1", "src/app/api/v1"),
  "src/lib/",
  "src/server/actions/"
].filter((value, index, arr) => arr.indexOf(value) === index);

function percentage(covered, total) {
  return total === 0 ? 100 : (covered / total) * 100;
}

function aggregateByPrefix(prefix) {
  const totals = {
    statements: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 }
  };

  for (const [file, metrics] of Object.entries(summary)) {
    if (file === "total") continue;
    const relative = file.replace(/^.*apps\/web\//, "");
    if (!relative.startsWith(prefix)) continue;

    for (const key of Object.keys(totals)) {
      totals[key].covered += metrics[key].covered;
      totals[key].total += metrics[key].total;
    }
  }

  return {
    statements: percentage(totals.statements.covered, totals.statements.total),
    lines: percentage(totals.lines.covered, totals.lines.total),
    functions: percentage(totals.functions.covered, totals.functions.total),
    branches: percentage(totals.branches.covered, totals.branches.total)
  };
}

function hasFailures(name, stats) {
  const failures = [];
  for (const key of Object.keys(THRESHOLDS)) {
    if (stats[key] < THRESHOLDS[key]) {
      failures.push(`${key} ${stats[key].toFixed(2)}% < ${THRESHOLDS[key]}%`);
    }
  }

  if (failures.length > 0) {
    console.error(`${name} failed coverage thresholds:`);
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    return true;
  }

  console.log(
    `${name} ok: statements ${stats.statements.toFixed(2)}%, branches ${stats.branches.toFixed(
      2
    )}%, functions ${stats.functions.toFixed(2)}%, lines ${stats.lines.toFixed(2)}%`
  );
  return false;
}

const globalStats = {
  statements: summary.total.statements.pct,
  lines: summary.total.lines.pct,
  functions: summary.total.functions.pct,
  branches: summary.total.branches.pct
};

let failed = false;
console.log(
  `global (informational only): statements ${globalStats.statements.toFixed(
    2
  )}%, branches ${globalStats.branches.toFixed(2)}%, functions ${globalStats.functions.toFixed(
    2
  )}%, lines ${globalStats.lines.toFixed(2)}%`
);

for (const prefix of MODULE_PREFIXES) {
  const stats = aggregateByPrefix(prefix);
  failed = hasFailures(prefix, stats) || failed;
}

if (failed) {
  process.exit(1);
}
