import type { ImageMetadata } from "@shared/types/models";

export async function getImageMetadataFromFile(
  file: File
): Promise<ImageMetadata> {
  const format = file.type || "unknown";
  const size = file.size;
  const lastModified = file.lastModified;

  if (!file.type.startsWith("image/")) {
    return { width: 0, height: 0, format, size, lastModified };
  }

  const url = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };
        image.onerror = () => reject(new Error("Failed to read image metadata"));
        image.src = url;
      }
    );

    return {
      width: dimensions.width,
      height: dimensions.height,
      format,
      size,
      lastModified
    };
  } catch {
    return { width: 0, height: 0, format, size, lastModified };
  } finally {
    URL.revokeObjectURL(url);
  }
}
