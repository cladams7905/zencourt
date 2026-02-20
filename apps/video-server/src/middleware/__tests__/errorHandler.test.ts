import { Request, Response } from "express";
import {
  errorHandler,
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";

jest.mock("@/config/logger", () => ({
  __esModule: true,
  default: {
    error: jest.fn()
  }
}));

function createReq() {
  return {
    method: "POST",
    url: "/video/generate",
    path: "/video/generate",
    get: jest.fn(() => "test"),
    ip: "127.0.0.1",
    params: {},
    query: {}
  } as unknown as Request;
}

function createRes() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { status, json };
}

describe("errorHandler", () => {
  it("returns generic payload for VideoProcessingError", () => {
    const req = createReq();
    const res = createRes();
    const err = new VideoProcessingError(
      "sensitive upstream error",
      VideoProcessingErrorType.FAL_SUBMISSION_FAILED,
      { details: { providerResponse: "secret payload" } }
    );

    errorHandler(
      err,
      req,
      res as unknown as Response,
      jest.fn() as never
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error",
      code: VideoProcessingErrorType.FAL_SUBMISSION_FAILED,
      retryable: true
    });
  });

  it("returns generic payload for unknown errors", () => {
    const req = createReq();
    const res = createRes();
    const err = new Error("db exploded");

    errorHandler(
      err,
      req,
      res as unknown as Response,
      jest.fn() as never
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error",
      code: VideoProcessingErrorType.INTERNAL_ERROR,
      retryable: false
    });
  });
});
