import type { ListingContentSubcategory } from "@shared/types/models";
import type { ContentGenerationEvent } from "./types";

export async function requestContentGenerationStream(params: {
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: "video" | "image";
  focus: string;
  generationNonce: string;
  signal: AbortSignal;
}): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const response = await fetch(
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
    }
  );

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(
      (errorPayload as { message?: string }).message ||
        "Failed to generate listing post content"
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response not available");
  }

  return reader;
}

export async function* streamContentGenerationEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<ContentGenerationEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((entry) => entry.startsWith("data:"));
      if (!line) {
        continue;
      }

      const payload = line.replace(/^data:\s*/, "");
      if (!payload) {
        continue;
      }

      const event = JSON.parse(payload) as ContentGenerationEvent;
      yield event;
    }
  }
}
