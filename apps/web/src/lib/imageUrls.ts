import type { ProcessedImage } from "@web/src/types/images";

const STORAGE_PROXY_ROUTE = "/api/v1/storage/image";

export function buildStorageProxyUrl(
  rawUrl?: string | null
): string | undefined {
  if (!rawUrl) {
    return undefined;
  }
  return `${STORAGE_PROXY_ROUTE}?url=${encodeURIComponent(rawUrl)}`;
}

export function getImageDisplaySrc(image: ProcessedImage): string {
  // Use blob URLs for fresh uploads
  if (image.previewUrl?.startsWith("blob:")) {
    return image.previewUrl;
  }

  // For remote storage URLs, proxy them to add signed URL support
  const remoteUrl = image.url || image.uploadUrl;
  if (remoteUrl) {
    const proxied = buildStorageProxyUrl(remoteUrl);
    if (proxied) {
      return proxied;
    }
  }

  // Fallback to preview URL if nothing else available
  return image.previewUrl || "";
}

function shouldBypassOptimization(src: string): boolean {
  return (
    src.startsWith("blob:") ||
    src.startsWith("data:") ||
    src.startsWith(STORAGE_PROXY_ROUTE)
  );
}

export function getImageDisplayProps(image: ProcessedImage): {
  src: string;
  unoptimized: boolean;
} {
  const src = getImageDisplaySrc(image);
  return {
    src,
    unoptimized: shouldBypassOptimization(src)
  };
}
