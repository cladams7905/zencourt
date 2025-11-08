/**
 * Unified Image Classification API Route
 *
 * Server-side API endpoint for classifying room images using OpenAI Vision API.
 * Handles both single image and batch image classification.
 * This keeps the API key secure on the server side.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  classifyRoom,
  classifyRoomBatch
} from "../../../../server/services/aiVision";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max execution time for batch

interface ClassifyRequestSingle {
  imageUrl: string;
  timeout?: number;
  maxRetries?: number;
}

interface ClassifyRequestBatch {
  imageUrls: string[];
  concurrency?: number;
  timeout?: number;
  maxRetries?: number;
}

type ClassifyRequest = ClassifyRequestSingle | ClassifyRequestBatch;

/**
 * Type guard to check if request is for batch classification
 */
function isBatchRequest(body: ClassifyRequest): body is ClassifyRequestBatch {
  return "imageUrls" in body && Array.isArray(body.imageUrls);
}

/**
 * POST /api/v1/classify
 *
 * Classifies single or multiple images using OpenAI Vision API
 *
 * Single image request body:
 * {
 *   imageUrl: string;     // Public URL of the image to classify
 *   timeout?: number;     // Optional timeout in milliseconds
 *   maxRetries?: number;  // Optional max retry attempts
 * }
 *
 * Batch images request body:
 * {
 *   imageUrls: string[];    // Array of public URLs to classify
 *   concurrency?: number;   // Optional concurrent requests (default: 10)
 *   timeout?: number;       // Optional timeout per image in milliseconds
 *   maxRetries?: number;    // Optional max retry attempts per image
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: ClassifyRequest = await request.json();

    // Handle batch classification
    if (isBatchRequest(body)) {
      // Validate batch request
      if (!body.imageUrls || body.imageUrls.length === 0) {
        return NextResponse.json(
          { error: "imageUrls must be a non-empty array" },
          { status: 400 }
        );
      }

      // Classify the images in batch
      const results = await classifyRoomBatch(body.imageUrls, {
        concurrency: body.concurrency || 10,
        timeout: body.timeout || 30000,
        maxRetries: body.maxRetries || 2
      });

      return NextResponse.json({
        success: true,
        results
      });
    }

    // Handle single image classification
    const singleBody = body as ClassifyRequestSingle;

    // Validate single request
    if (!singleBody.imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    // Classify the image
    const classification = await classifyRoom(singleBody.imageUrl, {
      timeout: singleBody.timeout || 30000,
      maxRetries: singleBody.maxRetries || 2
    });

    return NextResponse.json({
      success: true,
      classification
    });
  } catch (error) {
    console.error("Classification error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Classification failed"
      },
      { status: 500 }
    );
  }
}
