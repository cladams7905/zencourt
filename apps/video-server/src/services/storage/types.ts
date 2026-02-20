export type StorageObjectKey = string;

export type StorageUploadResult = {
  url: string;
};

export interface StorageUploadOptions {
  bucket?: string;
  key: string;
  body: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageSignedUrlOptions {
  bucket?: string;
  key: string;
  expiresIn?: number;
}
