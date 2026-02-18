describe("cityDataset", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("loads/parses CSV and caches subsequent calls", async () => {
    const csv = [
      "city,city_ascii,state_id,county_name,lat,lng,population,zips",
      'Austin,Austin,TX,Travis County,30.2672,-97.7431,961855,"78701 78702"',
      'El Paso,El Paso,TX,El Paso County,31.7619,-106.4850,678815,"79901"',
      "Bad Row,Bad Row,TX,Nowhere County,not-a-lat,-10,1,00000"
    ].join("\n");

    const fetchMock = jest.fn(async () => ({ text: async () => csv }));
    Object.defineProperty(global, "fetch", { writable: true, value: fetchMock });

    const mod = await import("@web/src/lib/domain/location/cityDataset");
    const first = await mod.loadCityDataset();
    const second = await mod.loadCityDataset();

    expect(first).toHaveLength(2);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("builds city and county sets by state with normalization", async () => {
    const csv = [
      "city,city_ascii,state_id,county_name,lat,lng,population,zips",
      "San José,San Jose,CA,Santa Clara County,37.33,-121.89,1000,95112",
      "Austin,Austin,TX,Travis County,30.26,-97.74,900,78701"
    ].join("\n");

    Object.defineProperty(global, "fetch", {
      writable: true,
      value: jest.fn(async () => ({ text: async () => csv }))
    });

    const mod = await import("@web/src/lib/domain/location/cityDataset");
    const citySet = await mod.getCityNameSetForState("ca");
    const countySet = await mod.getCountyNameSetForState("ca");

    expect(citySet.has("san josé")).toBe(true);
    expect(citySet.has("san jose")).toBe(true);
    expect(countySet.has("santa clara")).toBe(true);
    expect(mod.normalizeCountyName("Travis County")).toBe("Travis");
  });
});
