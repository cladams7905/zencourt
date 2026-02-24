import { StatusCode } from "@shared/types/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error: string; message: string }
  ) {
    super(body.message);
    this.name = "ApiError";
  }
}

export { StatusCode };
