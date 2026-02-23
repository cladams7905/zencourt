import { S3Client } from "@aws-sdk/client-s3";
import {
  StorageService,
  StorageServiceError,
  StorageErrorType
} from "@/services/storage";

const mockGetSignedUrl = jest.fn();

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args)
}));

jest.mock("@/config/storage", () => ({
  storageClient: new (require("@aws-sdk/client-s3").S3Client)({
    region: "us-east-1"
  }),
  STORAGE_CONFIG: {
    region: "us-west-002",
    bucket: "test-bucket",
    endpoint: "https://s3.us-west-002.backblazeb2.com",
    publicBaseUrl: "https://cdn.example.com"
  }
}));

jest.mock("@/config/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

type MockS3Client = {
  send: jest.Mock;
};

function createMockS3Client(): MockS3Client {
  return { send: jest.fn() };
}

describe("StorageService", () => {
  let storage: StorageService;
  let mockClient: MockS3Client;
  const testBucket = "test-bucket";

  beforeEach(() => {
    mockClient = createMockS3Client();
    mockGetSignedUrl.mockResolvedValue("https://signed.example.com/key");
    storage = new StorageService(
      mockClient as unknown as S3Client,
      testBucket,
      { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 50 }
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
      expect(typeof storage.getPublicUrlForKey).toBe("function");
      expect(typeof storage.checkBucketAccess).toBe("function");
    });
  });

  describe("uploadFile", () => {
    it("uploads file and returns public URL", async () => {
      mockClient.send.mockResolvedValue({});

      const url = await storage.uploadFile({
        key: "user_1/file.txt",
        body: Buffer.from("content"),
        contentType: "text/plain",
        metadata: { userId: "user1" }
      });

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const sendCall = mockClient.send.mock.calls[0][0];
      expect(sendCall.input).toMatchObject({
        Bucket: testBucket,
        Key: "user_1/file.txt",
        Body: Buffer.from("content"),
        ContentType: "text/plain",
        Metadata: { userId: "user1" }
      });
      expect(url).toContain("cdn.example.com");
      expect(url).toContain(testBucket);
      expect(url).toContain("user_1");
      expect(url).toContain("file.txt");
    });

    it("uses custom bucket when provided", async () => {
      mockClient.send.mockResolvedValue({});

      await storage.uploadFile({
        bucket: "custom-bucket",
        key: "key",
        body: Buffer.from("x")
      });

      const sendCall = mockClient.send.mock.calls[0][0];
      expect(sendCall.input.Bucket).toBe("custom-bucket");
    });

    it("throws StorageServiceError on S3 failure", async () => {
      mockClient.send.mockRejectedValue(
        Object.assign(new Error("S3 unavailable"), { name: "NetworkingError" })
      );

      await expect(
        storage.uploadFile({
          key: "key",
          body: Buffer.from("x")
        })
      ).rejects.toMatchObject({
        message: "S3 unavailable",
        code: StorageErrorType.NETWORK_ERROR,
        retryable: true
      });
    });

    it("does not retry on non-retryable errors", async () => {
      mockClient.send.mockRejectedValue(
        Object.assign(new Error("Not found"), { Code: "NoSuchKey" })
      );

      await expect(
        storage.uploadFile({ key: "key", body: Buffer.from("x") })
      ).rejects.toMatchObject({
        code: StorageErrorType.NOT_FOUND,
        retryable: false
      });
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it("retries on retryable errors then succeeds", async () => {
      mockClient.send
        .mockRejectedValueOnce(
          Object.assign(new Error("Timeout"), { name: "TimeoutError" })
        )
        .mockResolvedValueOnce({});

      jest.useFakeTimers();
      const uploadPromise = storage.uploadFile({
        key: "key",
        body: Buffer.from("x")
      });
      await jest.runAllTimersAsync();
      const url = await uploadPromise;

      expect(mockClient.send).toHaveBeenCalledTimes(2);
      expect(url).toBeDefined();
      jest.useRealTimers();
    });
  });

  describe("deleteFile", () => {
    it("deletes file via S3", async () => {
      mockClient.send.mockResolvedValue({});

      await storage.deleteFile("", "user_1/file.txt");

      const sendCall = mockClient.send.mock.calls[0][0];
      expect(sendCall.input).toMatchObject({
        Bucket: testBucket,
        Key: "user_1/file.txt"
      });
    });

    it("uses custom bucket when provided", async () => {
      mockClient.send.mockResolvedValue({});

      await storage.deleteFile("custom-bucket", "key");

      const sendCall = mockClient.send.mock.calls[0][0];
      expect(sendCall.input.Bucket).toBe("custom-bucket");
      expect(sendCall.input.Key).toBe("key");
    });

    it("throws on delete failure", async () => {
      mockClient.send.mockRejectedValue(
        Object.assign(new Error("Access denied"), { Code: "AccessDenied" })
      );

      await expect(storage.deleteFile("", "key")).rejects.toMatchObject({
        code: StorageErrorType.ACCESS_DENIED,
        retryable: false
      });
    });
  });

  describe("getPublicUrlForKey", () => {
    it("returns public URL for key", () => {
      const url = storage.getPublicUrlForKey("user_1/file.txt");

      expect(url).toContain("cdn.example.com");
      expect(url).toContain(testBucket);
      expect(url).toContain("user_1/file.txt");
    });

    it("uses custom bucket when provided", () => {
      const url = storage.getPublicUrlForKey("key", "custom-bucket");

      expect(url).toContain("custom-bucket");
      expect(url).toContain("key");
    });
  });

  describe("checkBucketAccess", () => {
    it("returns true when bucket is accessible", async () => {
      mockClient.send.mockResolvedValue({});

      const result = await storage.checkBucketAccess();

      expect(result).toBe(true);
      const sendCall = mockClient.send.mock.calls[0][0];
      expect(sendCall.input.Bucket).toBe(testBucket);
    });

    it("returns false when bucket access fails", async () => {
      mockClient.send.mockRejectedValue(new Error("Bucket not found"));

      const result = await storage.checkBucketAccess();

      expect(result).toBe(false);
    });
  });

  describe("extractKeyFromUrl", () => {
    it("extracts key from https URL", () => {
      const url =
        "https://s3.us-west-002.backblazeb2.com/test-bucket/user_1/file.png";
      const key = storage.extractKeyFromUrl(url);

      expect(key).toBe("user_1/file.png");
    });

    it("strips bucket prefix when key starts with bucket name", () => {
      const storageWithBucket = new StorageService(
        mockClient as unknown as S3Client,
        "test-bucket"
      );
      const url = "https://cdn.example.com/test-bucket/user_1/file.png";
      const key = storageWithBucket.extractKeyFromUrl(url);

      expect(key).toBe("user_1/file.png");
    });

    it("throws StorageServiceError for invalid URL", () => {
      expect(() => storage.extractKeyFromUrl("not-a-valid-url!!!")).toThrow(
        StorageServiceError
      );
    });
  });

  describe("handleStorageError mapping", () => {
    it("maps NoSuchBucket to INVALID_BUCKET", async () => {
      mockClient.send.mockRejectedValue(
        Object.assign(new Error("Bucket missing"), { Code: "NoSuchBucket" })
      );

      await expect(
        storage.uploadFile({ key: "key", body: Buffer.from("x") })
      ).rejects.toMatchObject({
        code: StorageErrorType.INVALID_BUCKET,
        retryable: false
      });
    });

    it("maps Forbidden to ACCESS_DENIED", async () => {
      mockClient.send.mockRejectedValue(
        Object.assign(new Error("Forbidden"), { name: "Forbidden" })
      );

      await expect(
        storage.uploadFile({ key: "key", body: Buffer.from("x") })
      ).rejects.toMatchObject({
        code: StorageErrorType.ACCESS_DENIED,
        retryable: false
      });
    });

    it("rethrows StorageServiceError unchanged", async () => {
      const original = new StorageServiceError(
        "Custom error",
        StorageErrorType.NOT_FOUND,
        {},
        false
      );
      mockClient.send.mockRejectedValue(original);

      await expect(
        storage.uploadFile({ key: "key", body: Buffer.from("x") })
      ).rejects.toBe(original);
    });
  });
});
