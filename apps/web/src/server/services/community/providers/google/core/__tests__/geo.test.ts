async function importGeoWithMocks(params: {
  existsSyncReturn?: boolean;
  csvText?: string;
}) {
  jest.resetModules();
  const existsSync = jest.fn().mockReturnValue(params.existsSyncReturn ?? true);
  const readFile = jest.fn().mockResolvedValue(params.csvText ?? "");

  jest.doMock("node:fs", () => ({ existsSync }));
  jest.doMock("node:fs/promises", () => ({ readFile }));

  const mod = await import("@web/src/server/services/community/providers/google/core/geo");
  return { mod, existsSync, readFile };
}

describe("google geo", () => {
  it("returns empty dataset when csv is missing", async () => {
    const { mod } = await importGeoWithMocks({ existsSyncReturn: false });
    const logger = { warn: jest.fn() };

    const result = await mod.loadCityDataset(logger);

    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("returns empty dataset for empty csv file", async () => {
    const { mod } = await importGeoWithMocks({ existsSyncReturn: true, csvText: "" });
    const logger = { warn: jest.fn() };
    await expect(mod.loadCityDataset(logger)).resolves.toEqual([]);
  });

  it("parses csv and resolves zip locations", async () => {
    const csv = [
      "city,state_id,county_name,lat,lng,population,zips",
      "Austin,TX,Travis,30.2672,-97.7431,900000,78701 78702",
      "Austin,TX,Travis,30.2000,-97.7000,1000,78701",
      "Dallas,TX,Dallas,32.7767,-96.7970,1300000,75201"
    ].join("\n");

    const { mod } = await importGeoWithMocks({ existsSyncReturn: true, csvText: csv });
    const logger = { warn: jest.fn() };

    const dataset = await mod.loadCityDataset(logger);
    expect(dataset.length).toBe(3);

    const byPreferredCity = await mod.resolveZipLocation("78701", "Austin", "TX", logger);
    expect(byPreferredCity?.city).toBe("Austin");
    expect(byPreferredCity?.population).toBe(900000);

    const byZip = await mod.resolveZipLocation("75201", null, null, logger);
    expect(byZip?.city).toBe("Dallas");
  });

  it("skips rows with invalid coordinates and returns null for missing zip", async () => {
    const csv = [
      "city,state_id,county_name,lat,lng,population,zips",
      "BadCity,TX,Travis,not-a-lat,-97.7,1000,73301"
    ].join("\n");
    const { mod } = await importGeoWithMocks({ existsSyncReturn: true, csvText: csv });
    const logger = { warn: jest.fn() };

    await expect(mod.loadCityDataset(logger)).resolves.toEqual([]);
    await expect(mod.resolveZipLocation("73301", null, null, logger)).resolves.toBeNull();
  });

  it("computes and caches distances", async () => {
    const { mod } = await importGeoWithMocks({ existsSyncReturn: false });
    const cache = new mod.DistanceCache(30, -97);

    const d1 = cache.getDistanceKm(30.1, -97.1);
    const d2 = cache.getDistanceKm(30.1, -97.1);

    expect(d1).toBeGreaterThan(0);
    expect(d1).toBe(d2);
  });

  it("computes closest service area distance", async () => {
    const { mod } = await importGeoWithMocks({ existsSyncReturn: false });
    const cache = new mod.ServiceAreaDistanceCache([
      { lat: 30, lng: -97 },
      { lat: 32, lng: -96 }
    ] as never);

    const d = cache.getDistanceKm(30.1, -97.1);
    expect(d).toBeGreaterThan(0);
  });

  it("resolves service area centers by city/state", async () => {
    const { mod } = await importGeoWithMocks({ existsSyncReturn: false });
    const records = [
      { city: "Austin", state_id: "TX", population: 10, lat: 1, lng: 2 },
      { city: "Austin", state_id: "MN", population: 20, lat: 3, lng: 4 },
      { city: "Dallas", state_id: "TX", population: 30, lat: 5, lng: 6 }
    ] as never;

    const centers = mod.resolveServiceAreaCenters(
      ["Austin, TX", "Dallas"],
      { state_id: "TX" } as never,
      records
    );

    expect(centers).toHaveLength(2);
    expect(centers?.[0].state_id).toBe("TX");
  });

  it("returns null service centers for empty or unknown service areas", async () => {
    const { mod } = await importGeoWithMocks({ existsSyncReturn: false });
    const records = [{ city: "Austin", state_id: "TX", population: 10, lat: 1, lng: 2 }] as never;

    expect(mod.resolveServiceAreaCenters([], { state_id: "TX" } as never, records)).toBeNull();
    expect(
      mod.resolveServiceAreaCenters(["Unknown City"], { state_id: "TX" } as never, records)
    ).toBeNull();
  });
});
