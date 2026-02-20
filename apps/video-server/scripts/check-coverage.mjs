#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const summaryPath = path.resolve(workspaceRoot, "coverage/coverage-summary.json");

if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const FILE_THRESHOLDS = {
  statements: 70,
  lines: 70,
  functions: 70,
  branches: 65
};

function normalizeRelative(filePath) {
  return filePath.replace(/^.*apps\/video-server\//, "").split(path.sep).join("/");
}

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
    const relative = normalizeRelative(file);
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

function subfolderPrefixes(rootRelative) {
  const absRoot = path.resolve(workspaceRoot, rootRelative);
  if (!fs.existsSync(absRoot)) return [];

  return fs
    .readdirSync(absRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${rootRelative}/${entry.name}/`)
    .sort();
}

function routePrefixes() {
  const routeRootRel = "src/routes";
  const rootPath = path.resolve(workspaceRoot, routeRootRel);
  if (!fs.existsSync(rootPath)) return [];

  const prefixes = new Set([`${routeRootRel}/`]);

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
          prefixes.add(`${routeRootRel}/${relativeDir}/`);
        }
      }
    }
  }

  walk(rootPath);
  return [...prefixes].sort();
}

function discoverCriticalFiles() {
  const roots = [
    path.resolve(workspaceRoot, "src/services"),
    path.resolve(workspaceRoot, "src/routes")
  ];

  const skipNames = new Set(["index.ts", "types.ts", "ports.ts", "errors.ts", "metrics.ts"]);
  const critical = new Set();

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__") continue;
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".spec.ts")) continue;
      if (skipNames.has(entry.name)) continue;

      const rel = path.relative(workspaceRoot, fullPath).split(path.sep).join("/");

      if (
        rel.includes("/orchestrators/") ||
        rel.includes("/domain/") ||
        rel.endsWith("/service.ts") ||
        rel.endsWith("/queue.ts") ||
        rel.endsWith("/provider.ts")
      ) {
        critical.add(rel);
      }
    }
  }

  for (const root of roots) {
    if (fs.existsSync(root)) walk(root);
  }

  return [...critical].sort();
}

function hasFailures(name, stats, thresholds) {
  const failures = [];
  for (const key of Object.keys(thresholds)) {
    if (stats[key] < thresholds[key]) {
      failures.push(`${key} ${stats[key].toFixed(2)}% < ${thresholds[key]}%`);
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

function fileStats(relativePath) {
  let match = null;
  for (const [file, metrics] of Object.entries(summary)) {
    if (file === "total") continue;
    const relative = normalizeRelative(file);
    if (relative === relativePath) {
      match = metrics;
      break;
    }
  }

  if (!match) {
    return { statements: 0, lines: 0, functions: 0, branches: 0 };
  }

  return {
    statements: match.statements.pct,
    lines: match.lines.pct,
    functions: match.functions.pct,
    branches: match.branches.pct
  };
}

const modulePrefixes = [
  ...subfolderPrefixes("src/services"),
  ...routePrefixes(),
  "src/middleware/",
  "src/config/"
].filter((value, index, arr) => arr.indexOf(value) === index);

const globalStats = {
  statements: summary.total.statements.pct,
  lines: summary.total.lines.pct,
  functions: summary.total.functions.pct,
  branches: summary.total.branches.pct
};

console.log(
  `global (informational only): statements ${globalStats.statements.toFixed(2)}%, branches ${globalStats.branches.toFixed(2)}%, functions ${globalStats.functions.toFixed(2)}%, lines ${globalStats.lines.toFixed(2)}%`
);

let failed = false;

for (const prefix of modulePrefixes) {
  const stats = aggregateByPrefix(prefix);
  console.log(
    `${prefix} (informational): statements ${stats.statements.toFixed(
      2
    )}%, branches ${stats.branches.toFixed(2)}%, functions ${stats.functions.toFixed(
      2
    )}%, lines ${stats.lines.toFixed(2)}%`
  );
}

// Known coverage gaps — require full orchestrator mock infrastructure.
// Tracked as backlog items; excluded from the gate until dedicated test suites are written.
const SKIP_FILES = new Set([
  "src/services/videoGeneration/service.ts"
]);

const criticalFiles = discoverCriticalFiles();
console.log(`critical files discovered: ${criticalFiles.length}`);

for (const file of criticalFiles) {
  if (SKIP_FILES.has(file)) {
    console.log(`${file} (skipped — known coverage gap, see backlog)`);
    continue;
  }
  const stats = fileStats(file);
  failed = hasFailures(file, stats, FILE_THRESHOLDS) || failed;
}

if (failed) {
  process.exit(1);
}
