import { Request } from "express";
import {
  extractWebhookJobId,
  parseFalWebhookRequest
} from "@/routes/webhooks/domain/requests";

function createReq(overrides: Partial<Request> = {}): Request {
  return {
    query: {},
    body: {},
    header: jest.fn(() => undefined),
    ...overrides
  } as unknown as Request;
}

describe("webhook request parsing", () => {
  it("extracts requestId from query", () => {
    const req = createReq({ query: { requestId: "job-1" } });
    expect(extractWebhookJobId(req)).toBe("job-1");
  });

  it("extracts request_id fallback from query", () => {
    const req = createReq({ query: { request_id: "job-2" } });
    expect(extractWebhookJobId(req)).toBe("job-2");
  });

  it("parses webhook request context", () => {
    const req = createReq({
      query: { requestId: "job-3" },
      body: { request_id: "req-1", status: "completed" } as unknown as object,
      header: jest.fn((name: string) => {
        if (name === "x-fal-webhook-request-id") return "req-h";
        if (name === "x-fal-webhook-user-id") return "user-h";
        if (name === "x-fal-webhook-timestamp") return "123";
        if (name === "x-fal-webhook-signature") return "sig";
        return undefined;
      }) as unknown as Request["header"]
    });
    (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from("{}");

    const parsed = parseFalWebhookRequest(req);
    expect(parsed.jobId).toBe("job-3");
    expect(parsed.headers.requestId).toBe("req-h");
    expect(parsed.rawBody).toBeInstanceOf(Buffer);
  });
});
