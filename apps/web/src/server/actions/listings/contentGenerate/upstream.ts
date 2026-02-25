import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import type { ListingGenerationContext } from "./types";

/**
 * Builds the body for runContentGeneration (listing flow).
 */
export function buildUpstreamRequestBody(
  context: ListingGenerationContext
): PromptAssemblyInput {
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
      zip_code: addressParts.zipCode,
      writing_tone_level: 3,
      writing_tone_label: "Conversational",
      writing_style_description: "Friendly, conversational, and professional"
    },
    listing_subcategory: subcategory,
    listing_property_details: listingDetails,
    content_request: {
      platform: "instagram",
      content_type: mediaType === "video" ? "listing_reel" : "social_post",
      media_type: mediaType,
      focus,
      notes,
      generation_count: context.generationCount,
      template_id: context.templateId
    }
  };
}
