/**
 * Webhook endpoint for fal.ai callbacks
 *
 * This receives notifications when video generation completes
 */

import { NextRequest, NextResponse } from "next/server";
import {
  markVideoCompleted,
  markVideoFailed,
  getVideosByProject
} from "@/db/actions/videos";
import { uploadRoomVideo, downloadVideoFromUrl } from "@/services/storage";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = 'nodejs';
export const maxDuration = 60;

interface FalWebhookPayload {
  request_id: string;
  gateway_request_id?: string;
  status: "OK" | "ERROR";
  payload?: {
    video?: {
      url: string;
      file_size: number;
      content_type: string;
    };
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log("[FAL Webhook] Received callback");

    // Parse the webhook payload
    const body: FalWebhookPayload = await request.json();

    console.log("[FAL Webhook] Request ID:", body.request_id);
    console.log("[FAL Webhook] Status:", body.status);

    // TODO: Verify webhook signature for security
    // (implement signature verification using the documentation)

    // Find the video record by checking metadata for this request_id
    // We'll need to query videos where generationSettings contains this request_id
    const requestId = body.request_id;

    if (body.status === "OK" && body.payload?.video) {
      console.log("[FAL Webhook] ✓ Video generation successful");
      console.log("[FAL Webhook] Video URL:", body.payload.video.url);

      // We need to find which video record this belongs to
      // For now, log the success - we'll need to update the database schema
      // to track request_id -> video_record_id mapping

      return NextResponse.json({
        success: true,
        message: "Webhook received successfully"
      });

    } else if (body.status === "ERROR") {
      console.error("[FAL Webhook] ❌ Video generation failed");
      console.error("[FAL Webhook] Error:", body.error);

      return NextResponse.json({
        success: true,
        message: "Error webhook received"
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[FAL Webhook] Error processing webhook:", error);

    // Return 200 anyway to prevent retries for malformed requests
    return NextResponse.json({
      error: "Webhook processing failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 200 });
  }
}
