/**
 * Webhook Service
 *
 * Service for delivering webhook notifications with retry logic and HMAC signatures
 */

import axios, { AxiosError } from "axios";
import { createHmac } from "crypto";
import { logger } from "@/config/logger";
import { WebhookError, WebhookDeliveryOptions } from "@shared/types/video";

// ============================================================================
// Webhook Service Class
// ============================================================================

class WebhookService {
  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Send webhook with retry logic
   */
  async sendWebhook(options: WebhookDeliveryOptions): Promise<void> {
    const { url, secret, payload, maxRetries = 5, backoffMs = 1000 } = options;
    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, secret);

    logger.info(
      {
        url,
        jobId: payload.jobId,
        status: payload.status
      },
      "Sending webhook"
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(url, payload, {
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Delivery-Attempt": attempt.toString(),
            "X-Webhook-Timestamp": payload.timestamp,
            "User-Agent": "ZenCourt-Video-Server/1.0"
          },
          timeout: 10000, // 10 second timeout
          validateStatus: (status) => status >= 200 && status < 300
        });

        logger.info(
          {
            url,
            jobId: payload.jobId,
            status: payload.status,
            responseStatus: response.status,
            attempt
          },
          "Webhook delivered successfully"
        );

        return; // Success!
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isAxiosError = error instanceof AxiosError;
        const statusCode = isAxiosError ? error.response?.status : undefined;
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

        // If not retryable, throw immediately
        if (!isRetryable) {
          throw new WebhookError(
            `Webhook delivery failed with non-retryable error: ${lastError.message}`,
            "WEBHOOK_DELIVERY_ERROR",
            { url, statusCode, error: lastError }
          );
        }

        // If we have more attempts, wait before retrying
        if (attempt < maxRetries) {
          const delay = this.calculateBackoff(attempt, backoffMs);
          logger.debug(
            {
              attempt,
              delay
            },
            "Waiting before retry"
          );
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    logger.error(
      {
        url,
        jobId: payload.jobId,
        maxRetries,
        error: lastError?.message
      },
      "Webhook delivery failed after all retries"
    );

    throw new WebhookError(
      `Webhook delivery failed after ${maxRetries} attempts: ${lastError?.message}`,
      "WEBHOOK_DELIVERY_ERROR",
      { url, error: lastError }
    );
  }

  /**
   * Determine if an HTTP status code is retryable
   */
  private isRetryableError(statusCode?: number): boolean {
    if (!statusCode) {
      // Network errors are retryable
      return true;
    }

    // 4xx errors (except 408, 429) are not retryable
    if (statusCode >= 400 && statusCode < 500) {
      return statusCode === 408 || statusCode === 429;
    }

    // 5xx errors are retryable
    if (statusCode >= 500) {
      return true;
    }

    // Other errors are not retryable
    return false;
  }

  /**
   * Calculate exponential backoff delay
   * For 5 retries over ~1 hour: 1s, 2s, 4s, 8s, 16s (total ~31s base)
   * Then scaled up to spread over 1 hour: ~116s per base unit
   * Final delays: ~2min, ~4min, ~8min, ~15min, ~30min (total ~59min)
   */
  private calculateBackoff(attempt: number, baseMs: number): number {
    // Exponential backoff: baseMs * 2^(attempt-1)
    // Scale up by factor of ~116 to spread 5 attempts over 1 hour
    const scaleFactor = 116;
    const exponentialDelay = baseMs * scaleFactor * Math.pow(2, attempt - 1);

    // Cap at 30 minutes max for any single delay
    const maxDelay = 30 * 60 * 1000; // 30 minutes
    const cappedDelay = Math.min(exponentialDelay, maxDelay);

    // Add jitter: +/- 10% to avoid thundering herd
    const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);

    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);

    // Use timing-safe comparison to prevent timing attacks
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

// ============================================================================
// Singleton Export
// ============================================================================

export const webhookService = new WebhookService();
