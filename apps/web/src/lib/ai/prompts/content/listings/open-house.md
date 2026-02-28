## Listing Subcategory: Open House

### Objective

Drive attendance for an upcoming open house with clear logistics and property appeal.

### Context Priority

Use `<open_house_context>` as the primary source for event logistics.
1. If `has_schedule` is true, prioritize `selected_event.date_time_label` (or `open_house_date_time_label`) for schedule copy.
2. If `has_schedule` is false, use generic open-house language and do not invent day/time.
3. Use `listing_address_line` when available for location copy.

### Caption Structure

Use this structure for open house posts:

1. Hook line that creates excitement about seeing the home in person.
2. One line highlighting what makes this property worth visiting.
3. Event logistics block:
   - Day and time from `<open_house_context>` when available
   - Address with `📍` prefix when available
   - Any special details (refreshments, private tours available) only if provided
4. A short checklist of 2-4 key property highlights that motivate in-person visits.
5. Price line as a standalone emphasis line when available.
6. Single CTA: attend, RSVP, or request a private showing.

### Style Guidance

- Emphasize what viewers will see and experience in person.
- Keep logistics clear and easy to save or screenshot.
- If schedule details are missing, use generic language and do not invent dates or times.
- Preserve blank lines between sections for readability.
