# Agent Profile Template

This template defines the agent-specific context injected into each content generation request. All fields are populated dynamically from the agent's profile data.

---

## Template Structure

```xml
<agent_profile>

## Agent Identity
- **Name:** {agent_name}
- **Brokerage:** {brokerage_name}
- **Title:** {agent_title}

## Location
- **Primary Market:** {city}, {state}
- **Zip Code:** {zip_code}
- **Service Areas:** {service_areas}

## Writing Style
{writing_style_description}

</agent_profile>
```

---

## Field Definitions

### Agent Identity

**agent_name** (required)
The agent's full professional name as it should appear in content or be referenced.

- Example: `Sarah Mitchell`
- Example: `The Rodriguez Team`

**brokerage_name** (required)
The agent's affiliated brokerage.

- Example: `Compass`
- Example: `Keller Williams Realty`
- Example: `eXp Realty`

**agent_title** (optional)
Professional title or designation if applicable.

- Example: `Realtor®`
- Example: `Broker Associate`
- Example: `Luxury Home Specialist`
- Example: `Team Lead`

### Location

**city** (required)
Primary city the agent serves.

- Example: `Austin`
- Example: `San Diego`

**state** (required)
State abbreviation.

- Example: `TX`
- Example: `CA`

**zip_code** (required)
Primary zip code for market data localization.

- Example: `78701`
- Example: `92101`

**service_areas** (optional)
Additional neighborhoods, cities, or regions the agent serves. Comma-separated list.

- Example: `Downtown Austin, South Congress, East Austin, Westlake, Cedar Park`
- Example: `La Jolla, Pacific Beach, Mission Hills, North Park, Hillcrest`

### Writing Style

**writing_style_description** (required)
A brief description of the agent's preferred voice, tone, and communication style. This guides the content generation to match their authentic voice.

Example writing style descriptions:

> Warm, casual, and conversational. Speaks like a real person, not a brochure. Short sentences, friendly tone, and a little text lingo when it fits (occasional "lol", "tbh", "idk", "soooo"). Avoids corporate jargon and keeps it human.

> Professional and polished with an authoritative voice. Data-driven and analytical. Prefers to lead with facts and market insights. Minimal emoji use. Sophisticated vocabulary appropriate for luxury clientele.

> Energetic and enthusiastic without being over-the-top. Relatable and down-to-earth. Uses casual language and occasional slang that resonates with younger buyers. Comfortable with emoji and trending formats.

> Calm and reassuring with an educational focus. Patient explanations that don't talk down to the audience. Empathetic to first-time buyer anxieties. Supportive and encouraging tone.

---

## Example: Populated Template

```xml
<agent_profile>

## Agent Identity
- **Name:** Sarah Mitchell
- **Brokerage:** Compass
- **Title:** Realtor®

## Location
- **Primary Market:** Austin, TX
- **Zip Code:** 78701
- **Service Areas:** Downtown Austin, South Congress, East Austin, Westlake, Cedar Park, Round Rock

## Writing Style
Warm and approachable with a conversational tone. Uses humor occasionally but stays professional. Speaks directly to the audience like a knowledgeable friend. Prefers shorter sentences and punchy delivery. Comfortable with casual language but avoids slang. Uses emoji sparingly and purposefully.

</agent_profile>
```

---

## Usage Notes

1. **Name consistency:** Use the agent's name exactly as they want it to appear. Some prefer first name only in casual content, full name in professional content.

2. **Brokerage compliance:** Some brokerages have specific requirements for how the brokerage name must appear. Ensure compliance with brokerage marketing guidelines.

3. **Zip code for data:** The zip code is primarily used to localize market data. If the agent serves multiple distinct markets, use the primary/most active market.

4. **Service areas for content:** Service areas help the content engine reference specific neighborhoods naturally. More specific = better content.

5. **Writing style calibration:** The writing style description should be detailed enough to meaningfully guide tone but concise enough to not overwhelm the prompt. 2-4 sentences is ideal.

6. **Style consistency:** The generated content should feel like it could have been written by this specific agent. If content doesn't match their voice, refine the writing style description.
