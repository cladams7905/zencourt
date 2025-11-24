/**
 * Webhook Service Tests
 */

import { webhookService } from "../webhookService";
import axios from "axios";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { WebhookError } from "@shared/types/video";

jest.mock("axios");
jest.mock("@/config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const { AxiosError: AxiosErrorCtor } = jest.requireActual(
  "axios"
) as typeof import("axios");

type WebhookServiceInternals = {
  sleep: (ms: number) => Promise<void>;
  calculateBackoff: (attempt: number, baseMs: number) => number;
};

// Helper to create AxiosError
const createAxiosError = (status: number, message: string): AxiosError => {
  const config: AxiosRequestConfig = {
    headers: {} as any
  };
  const response: AxiosResponse = {
    data: {},
    status,
    statusText: message,
    headers: {},
    config: config as any
  };

  return new AxiosErrorCtor(
    message,
    undefined,
    config as any,
    undefined,
    response
  );
};

describe("WebhookService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendWebhook", () => {
    const serviceInternals =
      webhookService as unknown as WebhookServiceInternals;
    let sleepSpy: jest.SpyInstance<Promise<void>, [number]>;
    let backoffSpy: jest.SpyInstance<number, [number, number]>;

    beforeEach(() => {
      sleepSpy = jest
        .spyOn(serviceInternals, "sleep")
        .mockImplementation(() => Promise.resolve());
      backoffSpy = jest
        .spyOn(serviceInternals, "calculateBackoff")
        .mockReturnValue(1);
    });

    afterEach(() => {
      sleepSpy.mockRestore();
      backoffSpy.mockRestore();
    });

    const baseOptions = {
      url: "https://example.com/webhook",
      secret: "test-secret",
      payload: {
        jobId: "test-job-123",
        projectId: "test-project",
        status: "completed" as const,
        timestamp: "2025-01-01T00:00:00.000Z",
        result: {
          videoUrl: "https://s3.amazonaws.com/video.mp4",
          thumbnailUrl: "https://s3.amazonaws.com/thumb.jpg",
          duration: 120,
          fileSize: 5000000
        }
      },
      maxRetries: 3,
      backoffMs: 100
    };

    it("should send webhook successfully on first attempt", async () => {
      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { success: true }
      });

      await webhookService.sendWebhook(baseOptions);

      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(mockAxios.post).toHaveBeenCalledWith(
        baseOptions.url,
        baseOptions.payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "User-Agent": "Zencourt-Video-Server/1.0",
            "X-Webhook-Delivery-Attempt": "1",
            "X-Webhook-Signature": expect.any(String),
            "X-Webhook-Timestamp": baseOptions.payload.timestamp
          }),
          timeout: 15 * 60 * 1000,
          validateStatus: expect.any(Function)
        })
      );
    });

    it("should retry on retryable errors (500)", async () => {
      mockAxios.post
        .mockRejectedValueOnce(createAxiosError(500, "Internal Server Error"))
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true }
        });

      await webhookService.sendWebhook(baseOptions);

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });

    it("should retry on retryable errors (429 rate limit)", async () => {
      mockAxios.post
        .mockRejectedValueOnce(createAxiosError(429, "Too Many Requests"))
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true }
        });

      await webhookService.sendWebhook(baseOptions);

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });

    it("should retry on network errors", async () => {
      mockAxios.post
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true }
        });

      await webhookService.sendWebhook(baseOptions);

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });

    it("should not retry on non-retryable errors (400)", async () => {
      mockAxios.post.mockRejectedValue(createAxiosError(400, "Bad Request"));

      await expect(webhookService.sendWebhook(baseOptions)).rejects.toThrow(
        WebhookError
      );
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
    });

    it("should not retry on non-retryable errors (404)", async () => {
      mockAxios.post.mockRejectedValue(createAxiosError(404, "Not Found"));

      await expect(webhookService.sendWebhook(baseOptions)).rejects.toThrow(
        WebhookError
      );
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
    });

    it("should throw after max retries exhausted", async () => {
      mockAxios.post.mockRejectedValue(
        createAxiosError(500, "Internal Server Error")
      );

      await expect(webhookService.sendWebhook(baseOptions)).rejects.toThrow(
        WebhookError
      );
      expect(mockAxios.post).toHaveBeenCalledTimes(3); // maxRetries
    });

    it("should send failure webhook with error details", async () => {
      const failureOptions = {
        ...baseOptions,
        payload: {
          jobId: "test-job-123",
          projectId: "test-project",
          status: "failed" as const,
          timestamp: "2025-01-01T00:00:00.000Z",
          error: {
            message: "Processing failed",
            code: "PROCESSING_ERROR"
          }
        }
      };

      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { success: true }
      });

      await webhookService.sendWebhook(failureOptions);

      expect(mockAxios.post).toHaveBeenCalledWith(
        failureOptions.url,
        expect.objectContaining({
          error: expect.objectContaining({
            message: "Processing failed",
            code: "PROCESSING_ERROR"
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe("verifySignature", () => {
    const payload = JSON.stringify({ test: "data" });
    const secret = "test-secret";

    it("should verify valid signature", () => {
      const signature = require("crypto")
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const result = webhookService.verifySignature(payload, signature, secret);
      expect(result).toBe(true);
    });

    it("should reject invalid signature", () => {
      const invalidSignature = "invalid-signature";

      const result = webhookService.verifySignature(
        payload,
        invalidSignature,
        secret
      );
      expect(result).toBe(false);
    });

    it("should reject signature with wrong secret", () => {
      const signature = require("crypto")
        .createHmac("sha256", "wrong-secret")
        .update(payload)
        .digest("hex");

      const result = webhookService.verifySignature(payload, signature, secret);
      expect(result).toBe(false);
    });
  });

  describe("Type definitions", () => {
    it("should have correct WebhookPayload type", () => {
      const payload: import("@shared/types/api").VideoJobWebhookPayload = {
        jobId: "test",
        projectId: "project",
        status: "completed",
        timestamp: new Date().toISOString(),
        result: {
          videoUrl: "https://example.com/video.mp4",
          thumbnailUrl: "https://example.com/thumb.jpg",
          duration: 120,
          fileSize: 5000000
        }
      };

      expect(payload).toBeDefined();
    });

    it("should have correct WebhookDeliveryOptions type", () => {
      const options: import("@shared/types/video").WebhookDeliveryOptions = {
        url: "https://example.com/webhook",
        secret: "test-secret",
        payload: {
          jobId: "test",
          projectId: "project",
          status: "failed",
          timestamp: new Date().toISOString(),
          error: {
            message: "Test error",
            code: "TEST_ERROR"
          }
        },
        maxRetries: 5,
        backoffMs: 1000
      };

      expect(options).toBeDefined();
    });
  });
});
