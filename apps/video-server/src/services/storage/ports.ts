import type { StorageUploadOptions } from "./types";

export interface StorageFacade {
  uploadFile(options: StorageUploadOptions): Promise<string>;
  getPublicUrlForKey(key: string, bucket?: string): string;
  deleteFile(bucket: string, key: string): Promise<void>;
  checkBucketAccess(bucket?: string): Promise<boolean>;
  extractKeyFromUrl(url: string): string;
}
