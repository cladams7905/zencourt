/** @jest-environment node */

import {
  buildUpstreamRequestBody,
  consumeUpstreamListingStream
} from "../upstream";
import type { ListingGenerationContext } from "../types";

function makeStream(events: unknown[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const payload = events
    .map((e) => `data: ${JSON.stringify(e)}\n\n`)
    .join("");
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    }
  });
}

describe("upstream", () => {
  describe("buildUpstreamRequestBody", () => {
    it("builds body with listing category and content_request", () => {
      const context: ListingGenerationContext = {
        listingId: "listing-1",
        userId: "user-1",
        listingDetails: null,
        addressParts: { city: "Austin", state: "TX", zipCode: "78701" },
        resolvedState: "TX",
        propertyFingerprint: "fp1",
        cacheKey: "key1",
        subcategory: "new_listing",
        mediaType: "image",
        focus: "pool",
        notes: "spacious"
      };

      const body = buildUpstreamRequestBody(context);

      expect(body).toEqual({
        category: "listing",
        audience_segments: [],
        agent_profile: {
          agent_name: "",
          brokerage_name: "",
          agent_title: "Realtor",
          city: "Austin",
          state: "TX",
          zip_code: "78701"
        },
        listing_subcategory: "new_listing",
        listing_property_details: null,
        content_request: {
          platform: "instagram",
          content_type: "social_post",
          media_type: "image",
          focus: "pool",
          notes: "spacious"
        }
      });
    });

    it("uses listing_reel and video when mediaType is video", () => {
      const context: ListingGenerationContext = {
        listingId: "listing-1",
        userId: "user-1",
        listingDetails: { bedrooms: 3, bathrooms: 2 },
        addressParts: { city: "Austin", state: "TX", zipCode: "78701" },
        resolvedState: "TX",
        propertyFingerprint: "fp1",
        cacheKey: "key1",
        subcategory: "open_house",
        mediaType: "video",
        focus: "",
        notes: ""
      };

      const body = buildUpstreamRequestBody(context);

      expect(body.content_request).toEqual({
        platform: "instagram",
        content_type: "listing_reel",
        media_type: "video",
        focus: "",
        notes: ""
      });
      expect(body.listing_property_details).toEqual({ bedrooms: 3, bathrooms: 2 });
    });
  });

  describe("consumeUpstreamListingStream", () => {
    it("returns done items and errored false when stream has done event", async () => {
      const items = [
        {
          hook: "Test hook",
          broll_query: "q",
          body: null,
          cta: null,
          caption: "cap"
        }
      ];
      const stream = makeStream([{ type: "done", items }]);

      const result = await consumeUpstreamListingStream(stream);

      expect(result.doneItems).toEqual(items);
      expect(result.errored).toBe(false);
    });

    it("returns doneItems null and errored true when stream has error event", async () => {
      const stream = makeStream([
        { type: "error", message: "fail" }
      ]);

      const result = await consumeUpstreamListingStream(stream);

      expect(result.doneItems).toBeNull();
      expect(result.errored).toBe(true);
    });

    it("calls onEvent for each event", async () => {
      const delta = { type: "delta", text: "x" };
      const done = { type: "done", items: [] };
      const stream = makeStream([delta, done]);
      const onEvent = jest.fn();

      await consumeUpstreamListingStream(stream, { onEvent });

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(onEvent).toHaveBeenNthCalledWith(1, delta);
      expect(onEvent).toHaveBeenNthCalledWith(2, done);
    });

    it("sets errored true when error event appears after done", async () => {
      const items = [{ hook: "h", broll_query: "q", body: null, cta: null, caption: "c" }];
      const stream = makeStream([
        { type: "done", items },
        { type: "error", message: "late error" }
      ]);

      const result = await consumeUpstreamListingStream(stream);

      expect(result.doneItems).toEqual(items);
      expect(result.errored).toBe(true);
    });

    it("returns null doneItems when stream has no done event", async () => {
      const stream = makeStream([{ type: "delta", text: "only delta" }]);

      const result = await consumeUpstreamListingStream(stream);

      expect(result.doneItems).toBeNull();
      expect(result.errored).toBe(false);
    });
  });
});
