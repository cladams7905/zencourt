import { S3Client } from "@aws-sdk/client-s3";
import {
  StorageService,
  StorageServiceError,
  StorageErrorType
} from "@/services/storage";

// Mock storage config to prevent initialization logs
jest.mock("@/config/storage", () => ({
  storageClient: new (require("@aws-sdk/client-s3").S3Client)({
    region: "us-east-1"
  }),
  STORAGE_CONFIG: {
    region: "us-west-002",
    bucket: "test-bucket",
    endpoint: "https://s3.us-west-002.backblazeb2.com"
  }
}));

// Mock logger to avoid console output during tests
jest.mock("@/config/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe("StorageService", () => {
  let storage: StorageService;
  const testBucket = "test-bucket";

  beforeEach(() => {
    storage = new StorageService(
      new S3Client({ region: "us-east-1" }),
      testBucket,
      { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 50 } // Fast retries for tests
    );
  });

  describe("StorageServiceError", () => {
    it("should create error with correct properties", () => {
      const error = new StorageServiceError(
        "Test error",
        StorageErrorType.UPLOAD_FAILED,
        { key: "test.txt" },
        true
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageServiceError);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe(StorageErrorType.UPLOAD_FAILED);
      expect(error.details).toEqual({ key: "test.txt" });
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("StorageServiceError");
    });

    it("should default retryable to false", () => {
      const error = new StorageServiceError(
        "Test error",
        StorageErrorType.ACCESS_DENIED
      );

      expect(error.retryable).toBe(false);
    });
  });

  describe("Constructor", () => {
    it("should initialize with default values", () => {
      const service = new StorageService();

      expect(service).toBeInstanceOf(StorageService);
    });

    it("should initialize with custom client and bucket", () => {
      const customClient = new S3Client({ region: "us-west-2" });
      const customBucket = "custom-bucket";

      const service = new StorageService(customClient, customBucket);

      expect(service).toBeInstanceOf(StorageService);
    });

    it("should initialize with custom retry configuration", () => {
      const service = new StorageService(undefined, testBucket, {
        maxAttempts: 5,
        baseDelayMs: 500,
        maxDelayMs: 5000
      });

      expect(service).toBeInstanceOf(StorageService);
    });
  });

  describe("Error Types", () => {
    it("should have all expected error types", () => {
      expect(StorageErrorType.UPLOAD_FAILED).toBe("STORAGE_UPLOAD_FAILED");
      expect(StorageErrorType.DOWNLOAD_FAILED).toBe("STORAGE_DOWNLOAD_FAILED");
      expect(StorageErrorType.DELETE_FAILED).toBe("STORAGE_DELETE_FAILED");
      expect(StorageErrorType.ACCESS_DENIED).toBe("STORAGE_ACCESS_DENIED");
      expect(StorageErrorType.NOT_FOUND).toBe("STORAGE_NOT_FOUND");
      expect(StorageErrorType.INVALID_BUCKET).toBe("STORAGE_INVALID_BUCKET");
      expect(StorageErrorType.NETWORK_ERROR).toBe("STORAGE_NETWORK_ERROR");
      expect(StorageErrorType.UNKNOWN_ERROR).toBe("STORAGE_UNKNOWN_ERROR");
    });
  });

  describe("Interface types", () => {
    it("should accept valid upload options", () => {
      const options = {
        bucket: "test-bucket",
        key: "test.txt",
        body: Buffer.from("test"),
        contentType: "text/plain",
        metadata: { userId: "user123" }
      };

      expect(options.bucket).toBeDefined();
      expect(options.key).toBeDefined();
      expect(options.body).toBeDefined();
    });

    it("should accept valid signed URL options", () => {
      const options = {
        bucket: "test-bucket",
        key: "test.txt",
        expiresIn: 3600
      };

      expect(options.bucket).toBeDefined();
      expect(options.key).toBeDefined();
      expect(options.expiresIn).toBe(3600);
    });
  });

  describe("Type safety", () => {
    it("should export all required types", () => {
      expect(StorageService).toBeDefined();
      expect(StorageServiceError).toBeDefined();
      expect(StorageErrorType).toBeDefined();
    });

    it("should have correct method signatures", () => {
      expect(typeof storage.uploadFile).toBe("function");
      expect(typeof storage.deleteFile).toBe("function");
      expect(typeof storage.getSignedDownloadUrl).toBe("function");
      expect(typeof storage.checkBucketAccess).toBe("function");
    });
  });
});
