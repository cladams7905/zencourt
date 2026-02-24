import type { ListingContentSubcategory } from "@shared/types/models";
import { fetchStreamResponse } from "@web/src/lib/core/http/client";
import { streamSseEvents } from "@web/src/lib/sse/sseEventStream";
import type { ContentGenerationEvent } from "./types";

export async function requestContentGenerationStream(params: {
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: "video" | "image";
  focus: string;
  generationNonce: string;
  signal: AbortSignal;
}): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const response = await fetchStreamResponse(
    `/api/v1/listings/${params.listingId}/content/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subcategory: params.subcategory,
        media_type: params.mediaType,
        focus: params.focus,
        generation_nonce: params.generationNonce
      }),
      signal: params.signal
    },
    "Failed to generate listing post content"
  );

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response not available");
  }

  return reader;
}

export async function* streamContentGenerationEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<ContentGenerationEvent> {
  yield* streamSseEvents<ContentGenerationEvent>(reader);
}
