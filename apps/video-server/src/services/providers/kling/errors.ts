export class KlingProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string = "KLING_PROVIDER_ERROR",
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "KlingProviderError";
  }
}
