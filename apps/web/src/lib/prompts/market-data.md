# Market Data Template (Trimmed)

This template defines the market data context injected into content generation. All fields are populated dynamically from FRED and RentCast responses, formatted for optimal LLM consumption.

---

## Template Structure

```xml
<market_data location="{city}, {state}" zip_code="{zip_code}" as_of="{data_timestamp}">

## Housing Market Overview
{housing_market_summary}

## Price Metrics
- **Median Home Price:** {median_home_price}
- **Price Change (YoY):** {price_change_yoy}

## Inventory & Activity
- **Active Listings:** {active_listings}
- **Months of Supply:** {months_of_supply}
- **Avg Days on Market:** {avg_dom}
- **Sale-to-List Ratio:** {sale_to_list_ratio}

## Rental Snapshot
- **Median Rent:** {median_rent}
- **Rent Change (YoY):** {rent_change_yoy}

## Mortgage & Rates
- **30-Year Fixed Rate:** {rate_30yr}
- **Estimated Monthly Payment:** {estimated_monthly_payment}

## Affordability Context
- **Median Household Income:** {median_household_income}
- **Housing Affordability Index:** {affordability_index}

## Entry-Level Price Point
- **Entry-Level Price (25th Percentile):** {entry_level_price}
- **Estimated Entry-Level Payment:** {entry_level_payment}

## Market Conditions Summary
{market_conditions_narrative}

</market_data>
```

---

## Field Definitions

### Header Attributes

**location** (required)
City and state for this market data.

**zip_code** (required)
Primary zip code for this data pull.

**as_of** (required)
Timestamp indicating data freshness. ISO 8601 format.

---

### Housing Market Overview

**housing_market_summary** (generated)
1-2 sentence summary of current market conditions.

---

### Price Metrics

**median_home_price** (RentCast)
Median sale price for the area. Formatted with dollar sign and commas.

**price_change_yoy** (RentCast/FRED)
Year-over-year price change as percentage.

---

### Inventory & Activity

**active_listings** (RentCast)
Current number of active listings in the area.

**months_of_supply** (RentCast/calculated)
Current inventory divided by monthly sales rate.

**avg_dom** (RentCast)
Average days on market for sold properties.

**sale_to_list_ratio** (RentCast/calculated)
Average sale price as percentage of list price.

---

### Rental Snapshot

**median_rent** (RentCast)
Median monthly rent for the area.

**rent_change_yoy** (RentCast)
Year-over-year rent change as percentage.

---

### Mortgage & Rates

**rate_30yr** (FRED: MORTGAGE30US)
Current 30-year fixed mortgage rate.

**estimated_monthly_payment** (calculated)
Estimated P&I payment at median price with 20% down at current 30-year rate.

---

### Affordability Context

**median_household_income** (FRED)
Median household income for the metro/region.

**affordability_index** (calculated)
Relative affordability index for the market.

---

### Entry-Level Price Point

**entry_level_price** (RentCast/calculated)
Price at the 25th percentile for the market.

**entry_level_payment** (calculated)
Estimated monthly payment at entry-level price.

---

### Market Conditions Summary

**market_conditions_narrative** (generated)
Short summary interpreting the metrics in plain language.
