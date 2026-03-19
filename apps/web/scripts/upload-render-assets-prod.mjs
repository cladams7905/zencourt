#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    path.join(os.tmpdir(), "zencourt-render-assets-prod-")
  );
  const envFile = path.join(tempDir, ".env.production");
  const uploaderScript = path.join(__dirname, "upload-render-assets.mjs");
  const extraArgs = process.argv.slice(2);

  try {
    await runCommand(
      "vercel",
      ["env", "pull", envFile, "--environment=production", "--yes"],
      {
        cwd: path.resolve(__dirname, "..")
      }
    );

    await runCommand(
      "dotenv",
      ["-e", envFile, "--", "node", uploaderScript, ...extraArgs],
      {
        cwd: path.resolve(__dirname, "..")
      }
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[upload-render-assets-prod] Failed", error);
  process.exitCode = 1;
});
