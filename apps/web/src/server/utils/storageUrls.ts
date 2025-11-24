import storageService from "../services/storageService";
import {
  createChildLogger,
  logger as baseLogger
} from "../../lib/logger";
import { isUrlFromStorageEndpoint } from "@shared/utils/storagePaths";

const logger = createChildLogger(baseLogger, {
  module: "storage-url-utils"
});

const storageEndpoint = process.env.B2_ENDPOINT || null;

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export function isManagedStorageUrl(url: string): boolean {
  return isUrlFromStorageEndpoint(url, storageEndpoint);
}

export async function ensurePublicUrl(
  url: string,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string> {
  if (!url) {
    throw new Error("URL is required to ensure public access");
  }

  if (!isManagedStorageUrl(url)) {
    return url;
  }

  const signedResult = await storageService.getSignedDownloadUrl(
    url,
    expiresIn
  );

  if (!signedResult.success) {
    logger.error(
      {
        url,
        error: signedResult.error
      },
      "Failed to generate signed download URL"
    );
    throw new Error(
      signedResult.error || "Failed to generate signed download URL"
    );
  }

  return signedResult.url;
}

export async function ensurePublicUrls(
  urls: string[],
  expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string[]> {
  return Promise.all(urls.map((url) => ensurePublicUrl(url, expiresIn)));
}
