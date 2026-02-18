#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");

const summaryPath = path.resolve(webRoot, "coverage/coverage-summary.json");
if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}`);
  process.exit(1);
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

const MODULE_PREFIXES = [
  ...subfolderPrefixes("src/components", "src/components"),
  ...subfolderPrefixes("src/server/services", "src/server/services"),
  "src/lib/",
  "src/server/actions/"
];

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
failed = hasFailures("global", globalStats) || failed;

for (const prefix of MODULE_PREFIXES) {
  const stats = aggregateByPrefix(prefix);
  failed = hasFailures(prefix, stats) || failed;
}

if (failed) {
  process.exit(1);
}
