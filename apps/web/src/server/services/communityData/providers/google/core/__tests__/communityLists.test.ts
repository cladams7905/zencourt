import {
  applyAudienceDelta,
  getAudienceSkipCategories,
  trimCommunityDataLists
} from "@web/src/server/services/communityData/providers/google/core/communityLists";

const baseCommunityData = {
  city: "Austin",
  state: "TX",
  zip_code: "78701",
  data_timestamp: "2025-01-01T00:00:00.000Z",
  neighborhoods_list: "- N1\n- N2",
  neighborhoods_family_list: "- NF1",
  neighborhoods_luxury_list: "- NL1",
  neighborhoods_senior_list: "- NS1",
  neighborhoods_relocators_list: "- NR1",
  dining_list: "- D1\n- D2",
  coffee_brunch_list: "- C1",
  nature_outdoors_list: "- O1",
  entertainment_list: "- E1",
  attractions_list: "- A1",
  sports_rec_list: "- S1",
  arts_culture_list: "- AC1",
  nightlife_social_list: "- N1",
  fitness_wellness_list: "- F1",
  shopping_list: "- SH1",
  education_list: "- ED1",
  community_events_list: "- EV1",
  seasonal_geo_sections: {}
};

describe("google core communityLists", () => {
  it("applies delta and keeps deduped preferred ordering", () => {
    const updated = applyAudienceDelta(baseCommunityData as never, {
      dining: "- D2\n- D3"
    });

    expect(updated.dining_list.split("\n")[0]).toBe("- D2");
    expect(updated.dining_list).toContain("- D3");
  });

  it("trims community data lists and keeps seasonal sections object", () => {
    const trimmed = trimCommunityDataLists({
      ...baseCommunityData,
      dining_list: "- D1\n- D2\n- D3\n- D4\n- D5\n- D6\n- D7\n- D8\n- D9"
    });

    expect(trimmed.dining_list.split("\n").length).toBeLessThanOrEqual(8);
    expect(trimmed.seasonal_geo_sections).toEqual({});
  });

  it("builds skip categories from valid non-empty delta lists", () => {
    const skip = getAudienceSkipCategories({
      dining: "- D1\n- D2\n- D3",
      coffee_brunch: "- (none found)"
    });

    expect(skip.has("dining")).toBe(true);
    expect(skip.has("coffee_brunch")).toBe(false);
  });
});
