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
  bathrooms?: number | null;
  listing_price?: number | null;
  lot_size_acres?: number | null;
  stories?: number | null;
  architecture?: string | null;
  exterior_features?: {
    materials?: string[] | null;
    highlights?: string[] | null;
  } | null;
  interior_features?: {
    kitchen?: {
      features?: string[] | null;
    } | null;
    primary_suite?: {
      features?: string[] | null;
    } | null;
  } | null;
  living_spaces?: string[] | null;
  additional_spaces?: string[] | null;
  sale_history?: ListingSaleHistory[] | null;
  valuation_estimates?: {
    range_low_usd?: number | null;
    range_high_usd?: number | null;
    third_party_examples?: ListingValuationExample[] | null;
  } | null;
  location_context?: {
    subdivision?: string | null;
    street_type?: string | null;
    lot_type?: string | null;
    county?: string | null;
    state?: string | null;
  } | null;
  sources?: ListingPropertySource[] | null;
};
