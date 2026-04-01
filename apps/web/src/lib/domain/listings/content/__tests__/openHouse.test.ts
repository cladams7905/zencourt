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

  it("supports start-only schedules", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        open_house_events: [{ date: "2026-03-01", start_time: "11:00" }]
      },
      now: new Date("2026-02-28T00:00:00.000Z")
    });

    expect(result.openHouseDateTimeLabel).toBe("Mar 1st, 11AM");
  });

  it("supports non-ISO date formats and compact meridiem labels", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        address: "456 Oak Ave, Austin, TX",
        open_house_events: [
          { date: "March 2, 2026", start_time: "1pm", end_time: "3pm" }
        ]
      },
      listingAddress: "123 Main St, Austin, TX",
      now: new Date("2026-03-01T00:00:00.000Z")
    });

    expect(result.openHouseDateTimeLabel).toBe("Mar 2nd, 1-3PM");
    expect(result.listingAddressLine).toBe("456 Oak Ave, Austin, TX");
  });

  it("renders until-labels when only end time is available", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        open_house_events: [{ date: "2026-03-01", end_time: "15:30" }]
      },
      now: new Date("2026-02-28T00:00:00.000Z")
    });

    expect(result.openHouseDateTimeLabel).toBe("Mar 1st, until 3:30PM");
  });

  it("falls back to the listing address when property details have no address", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        address: "   ",
        open_house_events: [{ date: "2026-03-01" }]
      },
      listingAddress: "123 Main St, Austin, TX"
    });

    expect(result.listingAddressLine).toBe("123 Main St, Austin, TX");
  });

  it("treats invalid times as a date-only schedule when the date is valid", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        open_house_events: [
          { date: "2026-03-01", start_time: "bad", end_time: "also-bad" }
        ]
      },
      now: new Date("2026-02-28T00:00:00.000Z")
    });

    expect(result.hasSchedule).toBe(true);
    expect(result.openHouseDateTimeLabel).toBe("Mar 1st");
  });

  it("returns an empty context when there are no events", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        open_house_events: []
      }
    });

    expect(result.hasAnyEvent).toBe(false);
    expect(result.hasSchedule).toBe(false);
    expect(result.openHouseDateTimeLabel).toBe("");
  });

  it("treats same-day events as past once their end time has elapsed", () => {
    const result = resolveListingOpenHouseContext({
      listingPropertyDetails: {
        open_house_events: [
          { date: "2026-03-01", start_time: "09:00", end_time: "10:00" },
          { date: "2026-03-02", start_time: "11:00", end_time: "13:00" }
        ]
      },
      now: new Date("2026-03-01T18:30:00.000Z")
    });

    expect(result.selectedEvent?.date).toBe("2026-03-02");
    expect(result.openHouseDateTimeLabel).toBe("Mar 2nd, 11AM-1PM");
  });
});
