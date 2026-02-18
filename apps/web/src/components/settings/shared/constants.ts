export const SETTINGS_HASH_TO_TAB: Record<string, "account" | "branding" | "subscription"> = {
  "#account": "account",
  "#profile": "branding",
  "#writing-style": "branding",
  "#media": "branding",
  "#target-audiences": "branding",
  "#subscription": "subscription"
};

export const TONE_SCALE = [
  {
    value: 1,
    label: "Very informal",
    description: "Texting lingo, playful, highly conversational",
    example:
      "ngl this kitchen is literally chef's kiss 👨‍🍳✨ the light hits just right and the vibes are immaculate. hmu if you wanna check it out"
  },
  {
    value: 2,
    label: "Informal",
    description: "Warm, casual, approachable voice",
    example:
      "This home has THAT energy—gorgeous natural light, a kitchen you'll want to spend all day in, and a backyard perfect for weekend hangouts. Come check it out!"
  },
  {
    value: 3,
    label: "Conversational",
    description: "Casual-professional, friendly, clear and concise",
    example:
      "Beautiful home with updated finishes, excellent natural lighting, and a functional floor plan that just works. I'd love to walk you through it, let's set up a time!"
  },
  {
    value: 4,
    label: "Formal",
    description: "Polished, authoritative, minimal slang",
    example:
      "This residence showcases quality construction and thoughtful design, featuring updated systems and an open floor plan. Contact us to arrange a private showing."
  },
  {
    value: 5,
    label: "Very formal",
    description: "Professional, structured, elevated tone",
    example:
      "This property presents superior craftsmanship, contemporary renovations, and harmonious spatial planning. We invite qualified inquiries."
  }
] as const;

export const AGENT_BIO_MAX_CHARS = 250;
export const AUDIENCE_DESCRIPTION_MAX_CHARS = 250;
export const WRITING_STYLE_MAX_CHARS = 250;

export const coerceToneValue = (preset: number | string | null): number => {
  if (preset === null || preset === undefined || preset === "") {
    return 3;
  }
  const numeric = Number(preset);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 5) {
    return numeric;
  }
  return 3;
};

export const SUBSCRIPTION_PLAN_LABELS: Record<
  string,
  { label: string; color: "secondary" | "default" }
> = {
  free: { label: "Free", color: "secondary" },
  starter: { label: "Starter", color: "default" },
  growth: { label: "Growth", color: "default" },
  enterprise: { label: "Enterprise", color: "default" }
};
