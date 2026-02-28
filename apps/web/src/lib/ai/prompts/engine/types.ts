import type { CommunityData, MarketData } from "@web/src/lib/domain/market/types";
import type {
  ListingContentSubcategory,
  ListingPropertyDetails
} from "@shared/types/models";
import type { ListingOpenHouseContext } from "@web/src/lib/domain/listings/openHouse";

export type PromptValues = Record<string, string | number | null | undefined>;

export type AgentProfileInput = {
  agent_name: string;
  brokerage_name: string;
  agent_title?: string | null;
  agent_bio?: string | null;
  city: string;
  state: string;
  zip_code: string;
  county?: string | null;
  service_areas?: string | null;
  writing_tone_level: number;
  writing_tone_label: string;
  writing_style_description: string;
  writing_style_notes?: string | null;
};

export type MarketDataInput = MarketData;
export type CommunityDataInput = CommunityData;

export type ContentRequestInput = {
  platform?: string | null;
  content_type?: string | null;
  media_type?: "image" | "video" | null;
  focus?: string | null;
  notes?: string | null;
  generation_count?: number | null;
  template_id?: string | null;
};

export type PromptAssemblyInput = {
  audience_segments: string[];
  category: string;
  agent_profile: AgentProfileInput;
  audience_description?: string | null;
  market_data?: MarketDataInput | null;
  community_data?: CommunityDataInput | null;
  city_description?: string | null;
  community_category_keys?: string[] | null;
  community_data_extra_sections?: Record<string, string> | null;
  listing_subcategory?: ListingContentSubcategory | null;
  listing_property_details?: ListingPropertyDetails | null;
  listing_open_house_context?: ListingOpenHouseContext | null;
  content_request?: ContentRequestInput | null;
  recent_hooks?: string[] | null;
};
