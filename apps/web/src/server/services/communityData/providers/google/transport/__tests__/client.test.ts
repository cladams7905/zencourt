import {
  fetchPlaceDetails,
  fetchPlaces,
  fetchPlacesNearby
} from "@web/src/server/services/communityData/providers/google/transport/client";

describe("google transport client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.GOOGLE_API_KEY = "test-key";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  it("returns empty/null when api key missing", async () => {
    delete process.env.GOOGLE_API_KEY;
    await expect(
      fetchPlaces("coffee", { lat: 1, lng: 2 }, 5, 1000)
    ).resolves.toEqual([]);
    await expect(fetchPlaceDetails("pid")).resolves.toBeNull();
  });

  it("fetches places and nearby places", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [{ id: "p1" }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ places: [{ id: "p2" }] })
      });

    await expect(
      fetchPlaces("coffee", { lat: 1, lng: 2 }, 5, 1000)
    ).resolves.toEqual([{ id: "p1" }]);
    await expect(
      fetchPlacesNearby(["restaurant"], { lat: 1, lng: 2 }, 5, 1000)
    ).resolves.toEqual([{ id: "p2" }]);
  });

  it("returns null/empty on failed responses", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

    await expect(
      fetchPlaces("coffee", { lat: 1, lng: 2 }, 5, 1000)
    ).resolves.toEqual([]);
    await expect(fetchPlaceDetails("pid")).resolves.toBeNull();
  });

  it("fetches place details", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: { text: "Place" } })
    });

    await expect(fetchPlaceDetails("pid")).resolves.toEqual({
      displayName: { text: "Place" }
    });
  });
});
