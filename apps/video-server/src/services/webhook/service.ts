import axios, { AxiosError } from "axios";
import { createHmac } from "crypto";
import logger from "@/config/logger";
import { WebhookError, WebhookDeliveryOptions } from "@shared/types/video";

const DEFAULT_TIMEOUT_MS =
  parseInt(process.env.WEBHOOK_TIMEOUT_MS || "", 10) || 15 * 60 * 1000;

class WebhookService {
  private generateSignature(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  async sendWebhook(options: WebhookDeliveryOptions): Promise<void> {
    const { url, secret, payload, maxRetries = 5, backoffMs = 1000 } = options;
    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, secret);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(url, payload, {
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Delivery-Attempt": attempt.toString(),
            "X-Webhook-Timestamp": payload.timestamp,
            "User-Agent": "Zencourt-Video-Server/1.0"
          },
          timeout: DEFAULT_TIMEOUT_MS,
          validateStatus: (status) => status >= 200 && status < 300
        });
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const axiosError = this.toAxiosError(error);
        const statusCode = axiosError?.response?.status;
        const isRetryable = this.isRetryableError(statusCode);

        logger.warn(
          {
            url,
            jobId: payload.jobId,
            attempt,
            maxRetries,
            statusCode,
            error: lastError.message,
            isRetryable
          },
          "Webhook delivery failed, will retry if retryable"
        );

        if (!isRetryable) {
          throw new WebhookError(
            `Webhook delivery failed with non-retryable error: ${lastError.message}`,
            "WEBHOOK_DELIVERY_ERROR",
            { url, statusCode, error: axiosError ?? lastError }
          );
        }

        if (attempt < maxRetries) {
          const delay = this.calculateBackoff(attempt, backoffMs);
          await this.sleep(delay);
        }
      }
    }

    throw new WebhookError(
      `Webhook delivery failed after ${maxRetries} attempts: ${lastError?.message}`,
      "WEBHOOK_DELIVERY_ERROR",
      { url, error: lastError }
    );
  }

  private isRetryableError(statusCode?: number): boolean {
    if (!statusCode) {
      return true;
    }
    if (statusCode >= 400 && statusCode < 500) {
      return statusCode === 408 || statusCode === 429;
    }
    if (statusCode >= 500) {
      return true;
    }
    return false;
  }

  private calculateBackoff(attempt: number, baseMs: number): number {
    const scaleFactor = 116;
    const exponentialDelay = baseMs * scaleFactor * Math.pow(2, attempt - 1);
    const maxDelay = 30 * 60 * 1000;
    const cappedDelay = Math.min(exponentialDelay, maxDelay);
    const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
    return Math.floor(cappedDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toAxiosError(error: unknown): AxiosError | null {
    if (error instanceof AxiosError) {
      return error;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "isAxiosError" in error &&
      (error as Partial<AxiosError>).isAxiosError
    ) {
      return error as AxiosError;
    }
    return null;
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    try {
      return (
        createHmac("sha256", secret).update(signature).digest("hex") ===
        createHmac("sha256", secret).update(expectedSignature).digest("hex")
      );
    } catch {
      return false;
    }
  }
}

export const webhookService = new WebhookService();
