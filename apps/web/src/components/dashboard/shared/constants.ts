import type {
  DashboardContentCategory,
  DashboardFilterLabel,
  DashboardContentType,
  GeneratedContentState
} from "@web/src/components/dashboard/shared/types";

export const DASHBOARD_FILTERS: { id: string; label: DashboardFilterLabel }[] = [
  { id: "listings", label: "Listings" },
  { id: "market-insights", label: "Market Insights" },
  { id: "educational", label: "Educational" },
  { id: "community", label: "Community" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "seasonal", label: "Seasonal" }
];

export const DEFAULT_ACTIVE_FILTER: DashboardFilterLabel = "Market Insights";

export const CATEGORY_LABEL_MAP: Record<DashboardFilterLabel, DashboardContentCategory> = {
  Listings: "listing",
  "Market Insights": "market_insights",
  Educational: "educational",
  Community: "community",
  Lifestyle: "lifestyle",
  Seasonal: "seasonal"
};

export const DEFAULT_AGENT_PROFILE = {
  agent_name: "Alex Rivera",
  brokerage_name: "Zencourt Realty",
  agent_title: "Realtor",
  city: "",
  state: "",
  zip_code: "",
  service_areas: "",
  writing_style_description:
    "Friendly, conversational, use occasional exclamation points and texting lingo (lol, tbh, idk, haha, soooo, wayyy)"
};

export const SESSION_STORAGE_KEY = "zencourt.generatedContent";
export const SESSION_TTL_MS = 60 * 60 * 1000;

export const GENERATED_BATCH_SIZE = 4;
export const INITIAL_SKELETON_HOLD_MS = 350;

export const DEFAULT_GENERATED_STATE: GeneratedContentState = {
  videos: {
    listing: [],
    market_insights: [],
    educational: [],
    community: [],
    lifestyle: [],
    seasonal: []
  },
  posts: {
    listing: [],
    market_insights: [],
    educational: [],
    community: [],
    lifestyle: [],
    seasonal: []
  },
  stories: {
    listing: [],
    market_insights: [],
    educational: [],
    community: [],
    lifestyle: [],
    seasonal: []
  }
};

export const DASHBOARD_CONTENT_TYPES: DashboardContentType[] = [
  "videos",
  "posts",
  "stories"
];
