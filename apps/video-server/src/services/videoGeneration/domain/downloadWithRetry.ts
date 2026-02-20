/**
 * Download utility with exponential backoff retry logic.
 * Consolidates duplicate download patterns from videoGenerationService.
 */

import axios from "axios";
import { createHash } from "crypto";

export interface DownloadOptions {
  /** URL to download from */
  url: string;
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Request timeout in milliseconds (default: 300000 for video, 60000 for images) */
  timeout?: number;
  /** Expected file size for validation */
  expectedSize?: number;
  /** Whether to validate size against content-length header (default: true) */
  validateSize?: boolean;
  /** Whether to compute SHA256 checksum (default: false) */
  computeChecksum?: boolean;
  /** Base delay for exponential backoff in ms (default: 500) */
  baseDelayMs?: number;
}

export interface DownloadResult {
  buffer: Buffer;
  checksumSha256?: string;
}

/**
 * Download a file with retry logic and exponential backoff.
 */
export async function downloadBufferWithRetry(
  options: DownloadOptions
): Promise<DownloadResult> {
  const {
    url,
    maxAttempts = 3,
    timeout = 300000,
    expectedSize,
    validateSize = true,
    computeChecksum = false,
    baseDelayMs = 500
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout
      });

      const buffer = Buffer.from(response.data);

      if (buffer.length === 0) {
        throw new Error("Downloaded file is empty");
      }

      if (validateSize) {
        const headerSize = response.headers["content-length"]
          ? Number(response.headers["content-length"])
          : null;
        const targetSize = expectedSize ?? headerSize;

        if (typeof targetSize === "number" && Number.isFinite(targetSize)) {
          if (buffer.length !== targetSize) {
            throw new Error(
              `Download size mismatch (${buffer.length} != ${targetSize})`
            );
          }
        }
      }

      const result: DownloadResult = { buffer };

      if (computeChecksum) {
        result.checksumSha256 = createHash("sha256")
          .update(buffer)
          .digest("hex");
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error("Failed to download file");
}

