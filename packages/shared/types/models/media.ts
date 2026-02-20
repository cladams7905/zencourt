export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  size: number;
  lastModified: number;
  perspective?: "aerial" | "ground";
};
