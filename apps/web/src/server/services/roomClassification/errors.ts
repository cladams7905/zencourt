export type RoomClassificationErrorCode =
  | "API_ERROR"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "RATE_LIMIT";

export class RoomClassificationError extends Error {
  constructor(
    message: string,
    public code: RoomClassificationErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = "RoomClassificationError";
  }
}
