import type { CategoryKey } from "@web/src/server/services/community/config";

export const HOLIDAY_QUERY_PACK: Partial<
  Record<CategoryKey, Record<string, string[]>>
> = {
  community_events: {
    january: ["new year celebration", "winter festival"],
    february: ["valentines event", "winter festival"],
    march: ["st patricks day parade", "spring festival"],
    april: ["easter egg hunt", "spring festival"],
    may: ["memorial day festival", "graduation celebration"],
    june: ["juneteenth festival", "pride festival"],
    july: ["fireworks shows", "summer festival"],
    august: ["back to school event", "summer festival"],
    september: ["labor day festival", "fall festival"],
    october: ["halloween festival", "fall festival"],
    november: ["thanksgiving parade", "holiday market"],
    december: ["holiday market", "tree lighting ceremony"]
  },
  dining: {
    february: ["valentines dinner", "romantic restaurant"],
    may: ["mothers day brunch", "graduation dinner"],
    june: ["fathers day brunch", "summer patio dining"],
    july: ["fourth of july bbq", "summer patio dining"],
    november: ["thanksgiving dinner", "holiday dining"],
    december: ["holiday dinner restaurant", "christmas brunch"]
  },
  coffee_brunch: {
    february: ["valentines coffee date", "cozy cafe"],
    may: ["mothers day brunch", "spring brunch spot"],
    november: ["holiday coffee shop", "seasonal latte"],
    december: ["holiday coffee shop", "hot chocolate cafe"]
  },
  nightlife_social: {
    february: ["valentines cocktail bar", "date night bar"],
    july: ["rooftop bar fireworks", "summer beer garden"],
    october: ["halloween bar crawl", "costume party bar"],
    december: ["holiday bar crawl", "new years eve bar"]
  },
  entertainment: {
    february: ["valentines show", "romantic concert"],
    july: ["fireworks show", "summer concert"],
    october: ["haunted house", "halloween show"],
    november: ["thanksgiving show", "holiday performance"],
    december: ["holiday lights display", "christmas show"]
  },
  attractions: {
    april: ["spring garden", "botanical garden bloom"],
    october: ["pumpkin patch", "fall farm"],
    november: ["holiday lights park", "winter lights display"],
    december: ["holiday lights park"]
  },
  nature_outdoors: {
    april: ["spring wildflower trail", "botanical garden"],
    october: ["fall foliage trail", "pumpkin patch"],
    december: ["christmas tree farm"]
  },
  sports_rec: {
    january: ["indoor ice skating rink", "winter sports center"],
    june: ["summer sports camp", "outdoor sports complex"],
    july: ["summer sports league", "outdoor sports complex"],
    october: ["fall sports league", "indoor sports complex"]
  },
  fitness_wellness: {
    january: ["new year gym special", "fitness challenge"],
    may: ["spring fitness class", "outdoor yoga"],
    september: ["fall fitness class", "wellness challenge"]
  },
  arts_culture: {
    march: ["st patricks day event", "spring art show"],
    october: ["halloween art show", "fall art festival"],
    december: ["holiday concert", "christmas theater"]
  },
  shopping: {
    august: ["back-to-school shopping", "school supply sale"],
    november: ["black friday shopping", "holiday shopping"],
    december: ["holiday shopping", "gift market"]
  }
};
