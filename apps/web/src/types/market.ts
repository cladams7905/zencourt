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
  neighborhoods_family_list: string;
  neighborhoods_luxury_list: string;
  neighborhoods_senior_list: string;
  neighborhoods_relocators_list: string;
  entertainment_list: string;
  arts_culture_list: string;
  attractions_list: string;
  sports_rec_list: string;
  nature_outdoors_list: string;
  dining_list: string;
  coffee_brunch_list: string;
  nightlife_social_list: string;
  fitness_wellness_list: string;
  shopping_list: string;
  education_list: string;
  community_events_list: string;
};
