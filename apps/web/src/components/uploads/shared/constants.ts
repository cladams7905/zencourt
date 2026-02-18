export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/bmp",
  "image/x-icon",
  "image/avif"
];

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/x-matroska",
  "video/webm",
  "video/ogg",
  "video/mpeg",
  "video/3gpp",
  "video/3gpp2"
];

export const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  mkv: "video/x-matroska",
  webm: "video/webm",
  ogg: "video/ogg",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2"
};

export const inferMimeType = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) {
    return "";
  }
  return MIME_BY_EXTENSION[ext] ?? "";
};
