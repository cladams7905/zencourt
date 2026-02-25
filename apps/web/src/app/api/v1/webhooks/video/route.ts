/**
 * Webhook endpoint for individual video job generation updates from video-server
 * Receives status updates when video jobs complete or fail
 *
 * POST /api/v1/webhooks/video
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  parseVerifiedWebhook,
  WebhookVerificationError
} from "@web/src/server/utils/webhookVerification";
import {
  processVideoWebhookPayload,
  type VideoWebhookPayload
} from "@web/src/server/actions/video/webhook";
import { apiErrorResponse, StatusCode } from "@web/src/app/api/v1/_responses";

const logger = createChildLogger(baseLogger, {
  module: "video-job-webhook"
});

export async function POST(request: NextRequest) {
  try {
    const payload = await parseVerifiedWebhook<VideoWebhookPayload>(request);
    const result = await processVideoWebhookPayload(payload);

    if (result.status === "not_found") {
      return apiErrorResponse(
        StatusCode.NOT_FOUND,
        "NOT_FOUND",
        "Video job not found for webhook update"
      );
    }

    if (result.status === "update_failed") {
      return NextResponse.json({
        success: false,
        message: "Video job webhook processed without DB update"
      });
    }

    return NextResponse.json({
      success: true,
      message: "Video job status updated"
    });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      logger.warn(
        { err: error.message },
        "Video job webhook failed verification"
      );
      return apiErrorResponse(
        error.status,
        "WEBHOOK_VERIFICATION_ERROR",
        error.message
      );
    }

    logger.error(
      {
        err: error instanceof Error ? error.message : String(error)
      },
      "Error processing video job webhook"
    );

    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
