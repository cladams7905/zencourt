#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

const DEFAULT_TARGETS = [
  {
    label: "arrows",
    sourceDir: path.join(appRoot, "public", "overlays", "arrows"),
    keyPrefix: "assets/arrows"
  }
];

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}

function normalizePrefix(prefix) {
  return prefix.replace(/^\/+|\/+$/g, "");
}

function buildContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".svg") {
    return "image/svg+xml";
  }
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "application/octet-stream";
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }
      return [fullPath];
    })
  );

  return files.flat();
}

async function uploadTarget(client, config, target, dryRun) {
  const files = await collectFiles(target.sourceDir);
  if (files.length === 0) {
    console.log(`[upload-render-assets] No files found in ${target.sourceDir}`);
    return [];
  }

  const uploaded = [];
  for (const filePath of files) {
    const relativePath = path.relative(target.sourceDir, filePath);
    const key = `${normalizePrefix(target.keyPrefix)}/${relativePath.replaceAll(path.sep, "/")}`;
    const contentType = buildContentType(filePath);

    if (dryRun) {
      console.log(`[dry-run] ${filePath} -> ${key}`);
      uploaded.push({ filePath, key, url: buildPublicUrl(config, key) });
      continue;
    }

    const body = await fs.readFile(filePath);
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );

    const url = buildPublicUrl(config, key);
    console.log(`[uploaded] ${filePath} -> ${key}${url ? ` (${url})` : ""}`);
    uploaded.push({ filePath, key, url });
  }

  return uploaded;
}

function buildPublicUrl(config, key) {
  const base = config.publicBaseUrl?.trim() || config.endpoint;
  const normalizedBase = base.replace(/\/+$/, "");
  const encodedSegments = key.split("/").map(encodeURIComponent).join("/");
  return `${normalizedBase}/${config.bucket}/${encodedSegments}`;
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run")
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = {
    endpoint: readRequiredEnv("B2_ENDPOINT"),
    region: process.env.B2_REGION?.trim() || "us-west-002",
    bucket: readRequiredEnv("B2_BUCKET_NAME"),
    keyId: readRequiredEnv("B2_KEY_ID"),
    applicationKey: readRequiredEnv("B2_APPLICATION_KEY"),
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL?.trim() || ""
  };

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey
    },
    forcePathStyle: false
  });

  const allUploads = [];
  for (const target of DEFAULT_TARGETS) {
    console.log(
      `[upload-render-assets] Processing ${target.label}: ${target.sourceDir} -> ${target.keyPrefix}`
    );
    const uploads = await uploadTarget(client, config, target, args.dryRun);
    allUploads.push(...uploads);
  }

  console.log(
    `[upload-render-assets] Completed ${args.dryRun ? "dry run for" : "upload of"} ${allUploads.length} file(s)`
  );
}

main().catch((error) => {
  console.error("[upload-render-assets] Failed", error);
  process.exitCode = 1;
});
