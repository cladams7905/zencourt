import { resolveListingOpenHouseContext } from "../openHouse";

describe("resolveListingOpenHouseContext", () => {
  it("selects the next upcoming event by date/time", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        open_house_events: [
          { date: "2026-03-05", start_time: "13:00", end_time: "15:00" },
          { date: "2026-03-01", start_time: "13:00", end_time: "15:00" },
          { date: "2026-03-02", start_time: "11:00", end_time: "13:00" }
        ]
      },
      listingAddress: "123 Main St, Austin, TX",
      now: new Date("2026-03-01T10:00:00.000Z")
    });

    expect(result.hasSchedule).toBe(true);
    expect(result.openHouseDateTimeLabel).toBe("Mar 1st, 1-3PM");
  });

  it("falls back to first valid event when all are in the past", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        open_house_events: [
          { date: "2026-02-14", start_time: "10:00", end_time: "12:00" },
          { date: "2026-02-01", start_time: "09:00", end_time: "11:00" }
        ]
      },
      now: new Date("2026-03-01T00:00:00.000Z")
    });

    expect(result.selectedEvent?.date).toBe("2026-02-01");
    expect(result.openHouseDateTimeLabel).toBe("Feb 1st, 9-11AM");
  });

  it("returns no schedule when date is invalid", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        open_house_events: [{ date: "not-a-date", start_time: "13:00" }]
      }
    });

    expect(result.hasAnyEvent).toBe(true);
    expect(result.hasSchedule).toBe(false);
    expect(result.openHouseDateTimeLabel).toBe("");
  });

  it("supports date-only schedules", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        open_house_events: [{ date: "2026-03-01" }]
      },
      now: new Date("2026-02-28T00:00:00.000Z")
    });

    expect(result.hasSchedule).toBe(true);
    expect(result.openHouseDateTimeLabel).toBe("Mar 1st");
  });
});
