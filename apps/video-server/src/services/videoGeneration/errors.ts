export enum ProviderErrorCode {
  INVALID_PROVIDER_INPUT = "INVALID_PROVIDER_INPUT",
  PROVIDER_DISPATCH_FAILED = "PROVIDER_DISPATCH_FAILED",
  PROVIDER_OUTPUT_MISSING = "PROVIDER_OUTPUT_MISSING",
  PROVIDER_CIRCUIT_OPEN = "PROVIDER_CIRCUIT_OPEN"
}

export class VideoGenerationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "VideoGenerationServiceError";
  }
}
