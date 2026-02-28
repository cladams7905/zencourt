/** @jest-environment node */

import { buildUpstreamRequestBody } from "../upstream";
import type { ListingGenerationContext } from "../types";

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
        openHouseContext: null,
        subcategory: "new_listing",
        mediaType: "image",
        focus: "pool",
        notes: "spacious",
        generationCount: 4,
        templateId: ""
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
          zip_code: "78701",
          writing_tone_level: 3,
          writing_tone_label: "Conversational",
          writing_style_description: "Friendly, conversational, and professional"
        },
        listing_subcategory: "new_listing",
        listing_property_details: null,
        content_request: {
          platform: "instagram",
          content_type: "social_post",
          media_type: "image",
          focus: "pool",
          notes: "spacious",
          generation_count: 4,
          template_id: ""
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
        openHouseContext: {
          hasAnyEvent: true,
          hasSchedule: true,
          selectedEvent: {
            date: "2026-03-01",
            startTime: "13:00",
            endTime: "15:00",
            dateLabel: "Mar 1st",
            timeLabel: "1-3PM",
            dateTimeLabel: "Mar 1st, 1-3PM"
          },
          openHouseDateTimeLabel: "Mar 1st, 1-3PM",
          openHouseOverlayLabel: "Mar 1st, 1-3PM",
          listingAddressLine: "123 Main St"
        },
        subcategory: "open_house",
        mediaType: "video",
        focus: "",
        notes: "",
        generationCount: 1,
        templateId: "template-123"
      };

      const body = buildUpstreamRequestBody(context);

      expect(body.content_request).toEqual({
        platform: "instagram",
        content_type: "listing_reel",
        media_type: "video",
        focus: "",
        notes: "",
        generation_count: 1,
        template_id: "template-123"
      });
      expect(body.listing_property_details).toEqual({ bedrooms: 3, bathrooms: 2 });
      expect(body.listing_open_house_context).toEqual(
        context.openHouseContext
      );
    });
  });
});
