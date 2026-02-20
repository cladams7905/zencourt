export class RunwayProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string = "RUNWAY_PROVIDER_ERROR",
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "RunwayProviderError";
  }
}
