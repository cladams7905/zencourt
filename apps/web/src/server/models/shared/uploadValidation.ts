export function toMegabytes(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

export function isImageMimeType(fileType: string): boolean {
  return fileType.startsWith("image/");
}

export function isVideoMimeType(fileType: string): boolean {
  return fileType.startsWith("video/");
}

export function buildUploadFailure(
  id: string,
  fileName: string,
  error: string
): { id: string; fileName: string; error: string } {
  return { id, fileName, error };
}
