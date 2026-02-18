const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const MONTH_TOPIC_HINTS = [
  "winter-related topics, New Year's resolutions, and cold-weather lifestyle",
  "winter living, Valentine's season, and cozy indoor activities",
  "early spring energy, St. Patrick's Day, and spring prep",
  "spring blooms, Easter season, and tax season",
  "peak spring, Memorial Day, and early summer planning",
  "summer kick-off and outdoor living",
  "summer events, Fourth of July, and backyard entertaining",
  "late-summer living, back-to-school, and end-of-summer prep",
  "early fall, Labor Day, and fall market momentum",
  "autumn leaves, Halloween, pumpkin spice, and cozy home themes",
  "Thanksgiving season, gratitude, and holiday hosting",
  "holiday season, year-end reflections, Christmas, and winter comfort"
];

export function buildTimeOfYearNote(now = new Date()): string {
  const monthIndex = now.getMonth();
  const monthName = MONTH_NAMES[monthIndex] ?? "this month";
  const year = now.getFullYear();
  const topicHint =
    MONTH_TOPIC_HINTS[monthIndex] ?? "seasonal topics and local events";
  return `Right now it is ${monthName} ${year}, so focus on ${topicHint}.`;
}
