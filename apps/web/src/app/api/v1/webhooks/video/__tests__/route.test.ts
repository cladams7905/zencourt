/** @jest-environment node */

const mockRevalidatePath = jest.fn();
const mockParseVerifiedWebhook = jest.fn();
const mockUpdateVideoGenJob = jest.fn();
const mockGetVideoGenJobById = jest.fn();

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}));

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

jest.mock("@web/src/server/actions/db/videoGenJobs", () => ({
  updateVideoGenJob: (...args: unknown[]) => mockUpdateVideoGenJob(...args),
  getVideoGenJobById: (...args: unknown[]) => mockGetVideoGenJobById(...args)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  createChildLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
}));

import { POST } from "../route";
import { WebhookVerificationError } from "@web/src/server/utils/webhookVerification";

describe("video webhook route", () => {
  const originalSetImmediate = global.setImmediate;

  beforeAll(() => {
    global.setImmediate = ((callback: (...args: unknown[]) => void) => {
      callback();
      return 0 as unknown as NodeJS.Immediate;
    }) as typeof setImmediate;
  });

  afterAll(() => {
    global.setImmediate = originalSetImmediate;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates job and returns success", async () => {
    mockParseVerifiedWebhook.mockResolvedValue({
      listingId: "listing-1",
      jobId: "job-1",
      status: "complete",
      result: {
        videoUrl: "https://video.mp4",
        thumbnailUrl: "https://thumb.jpg",
        duration: 4,
        fileSize: 10,
        metadata: { orientation: "vertical" }
      }
    });
    mockUpdateVideoGenJob.mockResolvedValue({ id: "job-1" });

    const response = await POST({} as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      message: "Video job status updated"
    });
  });

  it("falls back to getVideoGenJobById when update fails", async () => {
    mockParseVerifiedWebhook.mockResolvedValue({
      listingId: "listing-1",
      jobId: "job-1",
      status: "failed"
    });
    mockUpdateVideoGenJob.mockRejectedValue(new Error("db fail"));
    mockGetVideoGenJobById.mockResolvedValue(null);

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
      error: "invalid signature"
    });
  });

  it("returns 500 for unexpected errors", async () => {
    mockParseVerifiedWebhook.mockRejectedValue(new Error("boom"));

    const response = await POST({} as never);
    expect(response.status).toBe(500);
  });

  it("handles revalidatePath failures without failing webhook response", async () => {
    mockParseVerifiedWebhook.mockResolvedValue({
      listingId: "listing-1",
      jobId: "job-1",
      status: "complete",
      result: {}
    });
    mockUpdateVideoGenJob.mockResolvedValue({ id: "job-1" });
    mockRevalidatePath.mockImplementation(() => {
      throw new Error("revalidate failed");
    });

    const response = await POST({} as never);
    expect(response.status).toBe(200);
  });
});
