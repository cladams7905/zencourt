#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`
        )
      );
    });
  });
}

async function main() {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "zencourt-db-migrate-prod-")
  );
  const envFile = path.join(tempDir, ".env.production");

  const drizzleCwd = path.join(repoRoot, "packages", "db");
  const drizzleConfigPath = "drizzle/drizzle.config.ts";

  try {
    // Pull prod env vars from Vercel into a temp file so we don't need
    // to keep a committed/local `.env.prod` around.
    await runCommand(
      "vercel",
      ["env", "pull", envFile, "--environment=production", "--yes"],
      { cwd: repoRoot }
    );

    await runCommand(
      "dotenv",
      ["-e", envFile, "--", "drizzle-kit", "migrate", `--config=${drizzleConfigPath}`],
      { cwd: drizzleCwd }
    );
  } finally {
    // Ensure env vars are wiped even if the migration fails.
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[db-migrate-prod] Failed", error);
  process.exitCode = 1;
});

