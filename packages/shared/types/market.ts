export type MarketLocation = {
  city: string;
  state: string;
  zip_code: string;
};

export type MarketData = MarketLocation & {
  data_timestamp: string;
  housing_market_summary: string;
  median_home_price: string;
  price_change_yoy: string;
  active_listings: string;
  months_of_supply: string;
  avg_dom: string;
  sale_to_list_ratio: string;
  median_rent: string;
  rent_change_yoy: string;
  rate_30yr: string;
  estimated_monthly_payment: string;
  median_household_income: string;
  affordability_index: string;
  entry_level_price: string;
  entry_level_payment: string;
  market_conditions_narrative: string;
};

export type CommunityData = MarketLocation & {
  data_timestamp: string;
  neighborhoods_list: string;
  local_nickname: string;
  restaurants_list: string;
  coffee_shops_list: string;
  brunch_spots_list: string;
  parks_list: string;
  trails_list: string;
  public_schools_list: string;
  family_activities_list: string;
  shopping_list: string;
  farmers_markets_list: string;
  annual_events_list: string;
  local_favorites_narrative: string;
};
