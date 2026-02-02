export type ListingSaleHistory = {
  event?: string | null;
  close_date?: string | null;
  sale_price_usd?: number | null;
  price_per_sq_ft_usd?: number | null;
  list_to_sale_percent_change?: number | null;
  list_price_usd?: number | null;
};

export type ListingValuationExample = {
  provider?: string | null;
  value_usd?: number | null;
};

export type ListingPropertySource = {
  site?: string | null;
  notes?: string | null;
  citation?: string | null;
};

export type ListingPropertyDetails = {
  address?: string | null;
  property_type?: string | null;
  year_built?: number | null;
  living_area_sq_ft?: number | null;
  bedrooms?: number | null;
  bathrooms_full?: number | null;
  lot_size_acres?: number | null;
  architecture?: string | null;
  exterior_features?: {
    materials?: string[] | null;
    front_porch?: boolean | null;
    rear_deck?: boolean | null;
    other_features?: string[] | null;
  } | null;
  interior_features?: {
    flooring_main_level?: string | null;
    fireplace?: boolean | null;
    kitchen?: {
      countertops?: string | null;
      pantry?: boolean | null;
      open_to_family_room?: boolean | null;
      breakfast_area?: boolean | null;
    } | null;
    rooms_main_level?: string[] | null;
    laundry_room?: string | null;
    bedroom_layout?: {
      upper_level_bedrooms?: number | null;
      fourth_bedroom_or_bonus?: boolean | null;
    } | null;
    primary_bedroom?: {
      level?: string | null;
      approx_size?: string | null;
      features?: string[] | null;
    } | null;
  } | null;
  basement?: {
    type?: string | null;
    finished?: boolean | null;
  } | null;
  garage?: {
    car_capacity?: number | null;
    location?: string | null;
  } | null;
  hoa?: {
    has_hoa?: boolean | null;
    monthly_fee_usd?: number | null;
  } | null;
  sale_history?: ListingSaleHistory[] | null;
  valuation_estimates?: {
    range_low_usd?: number | null;
    range_high_usd?: number | null;
    third_party_examples?: ListingValuationExample[] | null;
  } | null;
  location_context?: {
    subdivision?: string | null;
    street_type?: string | null;
    county?: string | null;
    state?: string | null;
  } | null;
  sources?: ListingPropertySource[] | null;
};
