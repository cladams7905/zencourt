import { NextFunction, Request, Response } from "express";
import { authInternals, validateApiKey } from "@/middleware/auth";

jest.mock("@/config/logger", () => ({
  __esModule: true,
  default: {
    warn: jest.fn()
  }
}));

function createRes() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { status, json };
}

function createReq(headers: Record<string, string | undefined>) {
  return {
    method: "POST",
    url: "/video/generate",
    ip: "127.0.0.1",
    headers
  } as unknown as Request;
}

describe("validateApiKey", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.VIDEO_SERVER_CLIENT_KEYS;
    delete process.env.VIDEO_SERVER_API_KEY;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("rejects missing x-api-key with generic 401 payload", () => {
    process.env.VIDEO_SERVER_API_KEY = "secret";
    const req = createReq({});
    const res = createRes();
    const next = jest.fn() as NextFunction;

    validateApiKey(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized",
      message: "Unauthorized"
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts valid legacy key", () => {
    process.env.VIDEO_SERVER_API_KEY = "secret";
    const req = createReq({ "x-api-key": "secret" });
    const res = createRes();
    const next = jest.fn() as NextFunction;

    validateApiKey(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("enforces per-client keys when configured", () => {
    process.env.VIDEO_SERVER_CLIENT_KEYS = "client-a:key-a,client-b:key-b";

    const invalidReq = createReq({
      "x-client-id": "client-a",
      "x-api-key": "wrong"
    });
    const invalidRes = createRes();
    const next = jest.fn() as NextFunction;

    validateApiKey(invalidReq, invalidRes as unknown as Response, next);
    expect(invalidRes.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();

    const validReq = createReq({
      "x-client-id": "client-b",
      "x-api-key": "key-b"
    });
    const validRes = createRes();
    validateApiKey(validReq, validRes as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("authInternals", () => {
  it("parses client key pairs", () => {
    const parsed = authInternals.parseClientKeys("a:1,b:2");
    expect(parsed.get("a")).toBe("1");
    expect(parsed.get("b")).toBe("2");
  });
});
