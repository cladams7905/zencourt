# Community Places Data Template (Trimmed)

This template defines local places and points of interest injected into community-focused content generation. All fields are populated dynamically from Google Places API responses.

---

## Template Structure

```xml
<community_data location="{city}, {state}" zip_code="{zip_code}" as_of="{data_timestamp}">

## Location Overview
- **City:** {city}
- **State:** {state}
- **Neighborhoods Covered:** {neighborhoods_list}
- **Local Nickname/Identity:** {local_nickname}

## Dining & Coffee
### Top-Rated Restaurants
{restaurants_list}

### Coffee Shops & Cafes
{coffee_shops_list}

### Brunch Spots
{brunch_spots_list}

## Outdoor & Recreation
### Parks & Green Spaces
{parks_list}

### Hiking Trails
{trails_list}

## Schools & Family
### Top-Rated Public Schools
{public_schools_list}

### Family Activities
{family_activities_list}

## Shopping & Community
### Shopping Districts & Malls
{shopping_list}

### Farmers Markets
{farmers_markets_list}

### Annual Events & Festivals
{annual_events_list}

## Local Favorites Summary
{local_favorites_narrative}

</community_data>
```

---

## Field Definitions

### Header Attributes

**location** (required)
City and state for this community data.

**zip_code** (required)
Primary zip code for this data pull.

**as_of** (required)
Timestamp indicating data freshness. ISO 8601 format.

---

### Location Overview

**neighborhoods_list** (required)
Comma-separated list of key neighborhoods.

**local_nickname** (optional)
Short descriptor for the city's identity or nickname.

---

### Dining & Coffee

**restaurants_list** (required)
Top-rated restaurants (name + brief descriptor).

**coffee_shops_list** (required)
Popular coffee shops/cafes (name + brief descriptor).

**brunch_spots_list** (optional)
Notable brunch locations.

---

### Outdoor & Recreation

**parks_list** (required)
Major parks or green spaces.

**trails_list** (optional)
Popular hiking or walking trails.

---

### Schools & Family

**public_schools_list** (required)
Top-rated public schools relevant to the area.

**family_activities_list** (optional)
Kid-friendly activities and venues.

---

### Shopping & Community

**shopping_list** (optional)
Major shopping districts or malls.

**farmers_markets_list** (optional)
Recurring markets or local vendor hubs.

**annual_events_list** (optional)
Key annual events or festivals.

---

### Local Favorites Summary

**local_favorites_narrative** (generated)
Short narrative summary for quick context.
