export type AIVisionErrorCode =
  | "API_ERROR"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "RATE_LIMIT";

export class AIVisionError extends Error {
  constructor(
    message: string,
    public code: AIVisionErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = "AIVisionError";
  }
}
