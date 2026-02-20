import { consumeSseStream } from "@web/src/lib/sse/sseStreamReader";
import type {
  ContentStreamEvent,
  ListingGeneratedItem,
  ListingGenerationContext
} from "./types";

/**
 * Builds the JSON body for POST /api/v1/content/generate (listing flow).
 */
export function buildUpstreamRequestBody(
  context: ListingGenerationContext
): Record<string, unknown> {
  const { addressParts, resolvedState, listingDetails, subcategory, mediaType, focus, notes } =
    context;
  return {
    category: "listing",
    audience_segments: [],
    agent_profile: {
      agent_name: "",
      brokerage_name: "",
      agent_title: "Realtor",
      city: addressParts.city,
      state: resolvedState,
      zip_code: addressParts.zipCode
    },
    listing_subcategory: subcategory,
    listing_property_details: listingDetails,
    content_request: {
      platform: "instagram",
      content_type: mediaType === "video" ? "listing_reel" : "social_post",
      media_type: mediaType,
      focus,
      notes
    }
  };
}

export type ConsumeUpstreamResult = {
  doneItems: ListingGeneratedItem[] | null;
  errored: boolean;
};

export type ConsumeUpstreamOptions = {
  /** Called for each SSE event (e.g. to forward deltas/errors to the client). */
  onEvent?: (event: ContentStreamEvent) => void;
};

/**
 * Consumes the upstream SSE stream and collects the final "done" items and error flag.
 * Optionally forwards each event via onEvent (e.g. for proxying deltas to the client).
 */
export async function consumeUpstreamListingStream(
  stream: ReadableStream<Uint8Array>,
  options: ConsumeUpstreamOptions = {}
): Promise<ConsumeUpstreamResult> {
  const { onEvent } = options;
  let doneItems: ListingGeneratedItem[] | null = null;
  let errored = false;

  await consumeSseStream<ContentStreamEvent>(stream, (event) => {
    onEvent?.(event);
    if (event.type === "error") {
      errored = true;
    } else if (event.type === "done") {
      doneItems = event.items;
    }
  });

  return { doneItems, errored };
}
