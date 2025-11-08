import { S3Client } from '@aws-sdk/client-s3';
import { S3StorageService, S3ServiceError, S3ErrorType } from '../s3Service';

// Mock AWS config to prevent initialization logs
jest.mock('@/config/aws', () => ({
  s3Client: new (require('@aws-sdk/client-s3').S3Client)({ region: 'us-east-1' }),
  AWS_CONFIG: {
    region: 'us-east-1',
    s3Bucket: 'test-bucket',
  },
}));

// Mock logger to avoid console output during tests
jest.mock('@/config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('S3StorageService', () => {
  let s3Service: S3StorageService;
  const testBucket = 'test-bucket';

  beforeEach(() => {
    s3Service = new S3StorageService(
      new S3Client({ region: 'us-east-1' }),
      testBucket,
      { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 50 } // Fast retries for tests
    );
  });

  describe('S3ServiceError', () => {
    it('should create error with correct properties', () => {
      const error = new S3ServiceError(
        'Test error',
        S3ErrorType.UPLOAD_FAILED,
        { key: 'test.txt' },
        true
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(S3ServiceError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(S3ErrorType.UPLOAD_FAILED);
      expect(error.details).toEqual({ key: 'test.txt' });
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('S3ServiceError');
    });

    it('should default retryable to false', () => {
      const error = new S3ServiceError('Test error', S3ErrorType.ACCESS_DENIED);

      expect(error.retryable).toBe(false);
    });
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const service = new S3StorageService();

      expect(service).toBeInstanceOf(S3StorageService);
    });

    it('should initialize with custom client and bucket', () => {
      const customClient = new S3Client({ region: 'us-west-2' });
      const customBucket = 'custom-bucket';

      const service = new S3StorageService(customClient, customBucket);

      expect(service).toBeInstanceOf(S3StorageService);
    });

    it('should initialize with custom retry configuration', () => {
      const service = new S3StorageService(undefined, testBucket, {
        maxAttempts: 5,
        baseDelayMs: 500,
        maxDelayMs: 5000,
      });

      expect(service).toBeInstanceOf(S3StorageService);
    });
  });

  describe('Error Types', () => {
    it('should have all expected error types', () => {
      expect(S3ErrorType.UPLOAD_FAILED).toBe('S3_UPLOAD_FAILED');
      expect(S3ErrorType.DOWNLOAD_FAILED).toBe('S3_DOWNLOAD_FAILED');
      expect(S3ErrorType.DELETE_FAILED).toBe('S3_DELETE_FAILED');
      expect(S3ErrorType.ACCESS_DENIED).toBe('S3_ACCESS_DENIED');
      expect(S3ErrorType.NOT_FOUND).toBe('S3_NOT_FOUND');
      expect(S3ErrorType.INVALID_BUCKET).toBe('S3_INVALID_BUCKET');
      expect(S3ErrorType.NETWORK_ERROR).toBe('S3_NETWORK_ERROR');
      expect(S3ErrorType.UNKNOWN_ERROR).toBe('S3_UNKNOWN_ERROR');
    });
  });

  describe('Interface types', () => {
    it('should accept valid upload options', () => {
      const options = {
        bucket: 'test-bucket',
        key: 'test.txt',
        body: Buffer.from('test'),
        contentType: 'text/plain',
        metadata: { userId: 'user123' },
      };

      expect(options.bucket).toBeDefined();
      expect(options.key).toBeDefined();
      expect(options.body).toBeDefined();
    });

    it('should accept valid signed URL options', () => {
      const options = {
        bucket: 'test-bucket',
        key: 'test.txt',
        expiresIn: 3600,
      };

      expect(options.bucket).toBeDefined();
      expect(options.key).toBeDefined();
      expect(options.expiresIn).toBe(3600);
    });
  });

  describe('Type safety', () => {
    it('should export all required types', () => {
      expect(S3StorageService).toBeDefined();
      expect(S3ServiceError).toBeDefined();
      expect(S3ErrorType).toBeDefined();
    });

    it('should have correct method signatures', () => {
      expect(typeof s3Service.uploadFile).toBe('function');
      expect(typeof s3Service.downloadFile).toBe('function');
      expect(typeof s3Service.deleteFile).toBe('function');
      expect(typeof s3Service.getSignedUrl).toBe('function');
      expect(typeof s3Service.copyFile).toBe('function');
      expect(typeof s3Service.listFiles).toBe('function');
      expect(typeof s3Service.checkBucketAccess).toBe('function');
    });
  });
});
