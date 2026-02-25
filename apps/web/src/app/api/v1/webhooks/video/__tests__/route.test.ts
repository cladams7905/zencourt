/** @jest-environment node */

const mockParseVerifiedWebhook = jest.fn();
const mockProcessVideoWebhookPayload = jest.fn();

jest.mock("@web/src/server/utils/webhookVerification", () => {
  class MockWebhookVerificationError extends Error {
    status: number;
    constructor(message: string, status: number = 401) {
      super(message);
      this.status = status;
    }
  }
  return {
    parseVerifiedWebhook: (...args: unknown[]) => mockParseVerifiedWebhook(...args),
    WebhookVerificationError: MockWebhookVerificationError
  };
});

jest.mock("@web/src/server/actions/video/webhook", () => ({
  processVideoWebhookPayload: (...args: unknown[]) =>
    mockProcessVideoWebhookPayload(...args)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  createChildLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
}));

import { POST } from "../route";
import { WebhookVerificationError } from "@web/src/server/utils/webhookVerification";

describe("video webhook route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success when action returns ok", async () => {
    mockParseVerifiedWebhook.mockResolvedValue({ listingId: "listing-1", jobId: "job-1" });
    mockProcessVideoWebhookPayload.mockResolvedValue({ status: "ok" });

    const response = await POST({} as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      message: "Video job status updated"
    });
  });

  it("returns 404 when action returns not_found", async () => {
    mockParseVerifiedWebhook.mockResolvedValue({ listingId: "listing-1", jobId: "missing-job" });
    mockProcessVideoWebhookPayload.mockResolvedValue({ status: "not_found" });

    const response = await POST({} as never);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      success: false,
      code: "NOT_FOUND",
      error: "Video job not found for webhook update"
    });
  });

  it("returns success false when action returns update_failed", async () => {
    mockParseVerifiedWebhook.mockResolvedValue({ listingId: "listing-1", jobId: "job-1" });
    mockProcessVideoWebhookPayload.mockResolvedValue({ status: "update_failed" });

    const response = await POST({} as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: false,
      message: "Video job webhook processed without DB update"
    });
  });

  it("returns verification error status", async () => {
    mockParseVerifiedWebhook.mockRejectedValue(
      new WebhookVerificationError("invalid signature", 401)
    );

    const response = await POST({} as never);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      code: "WEBHOOK_VERIFICATION_ERROR",
      error: "invalid signature"
    });
  });

  it("returns 500 for unexpected errors", async () => {
    mockParseVerifiedWebhook.mockRejectedValue(new Error("boom"));

    const response = await POST({} as never);
    expect(response.status).toBe(500);
  });
});
