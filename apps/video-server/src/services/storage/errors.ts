export enum StorageErrorType {
  UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED",
  DOWNLOAD_FAILED = "STORAGE_DOWNLOAD_FAILED",
  DELETE_FAILED = "STORAGE_DELETE_FAILED",
  ACCESS_DENIED = "STORAGE_ACCESS_DENIED",
  NOT_FOUND = "STORAGE_NOT_FOUND",
  INVALID_BUCKET = "STORAGE_INVALID_BUCKET",
  NETWORK_ERROR = "STORAGE_NETWORK_ERROR",
  UNKNOWN_ERROR = "STORAGE_UNKNOWN_ERROR"
}

export class StorageServiceError extends Error {
  constructor(
    message: string,
    public code: StorageErrorType,
    public details?: unknown,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "StorageServiceError";
  }
}
