import type { StorageUploadOptions, StorageSignedUrlOptions } from "../storageService";

export interface StorageFacade {
  uploadFile(options: StorageUploadOptions): Promise<string>;
  getSignedDownloadUrl(options: StorageSignedUrlOptions): Promise<string>;
  deleteFile(bucket: string, key: string): Promise<void>;
  checkBucketAccess(bucket?: string): Promise<boolean>;
  extractKeyFromUrl(url: string): string;
}
