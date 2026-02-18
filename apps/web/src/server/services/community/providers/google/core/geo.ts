import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type CityRecord = {
  city: string;
  state_id: string;
  county_name: string;
  lat: number;
  lng: number;
  population: number;
  zips: string;
};

type LoggerLike = {
  warn: (context: unknown, message?: string) => void;
};

let cachedCityDatasetPath: string | null | undefined;
let cachedCityRecords: CityRecord[] | null = null;
let cachedZipIndex: Map<string, CityRecord> | null = null;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function resolveCityDatasetPath(): string | null {
  if (cachedCityDatasetPath !== undefined) {
    return cachedCityDatasetPath;
  }

  const candidates = [
    path.join(process.cwd(), "apps/web/public/uscities.csv"),
    path.join(process.cwd(), "public/uscities.csv"),
    path.join(process.cwd(), "web/public/uscities.csv")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedCityDatasetPath = candidate;
      return cachedCityDatasetPath;
    }
  }

  cachedCityDatasetPath = null;
  return cachedCityDatasetPath;
}

export async function loadCityDataset(logger: LoggerLike): Promise<CityRecord[]> {
  if (cachedCityRecords) {
    return cachedCityRecords;
  }

  const datasetPath = resolveCityDatasetPath();
  if (!datasetPath) {
    logger.warn({}, "uscities.csv not found; community lookup disabled");
    cachedCityRecords = [];
    return cachedCityRecords;
  }

  const text = await readFile(datasetPath, "utf8");
  const lines = text.split("\n").filter(Boolean);
  if (lines.length === 0) {
    cachedCityRecords = [];
    return cachedCityRecords;
  }

  const header = parseCsvLine(lines[0]);
  const headerIndex = new Map(header.map((key, index) => [key.trim(), index]));

  const getValue = (row: string[], key: string): string => row[headerIndex.get(key) ?? -1] ?? "";

  const records: CityRecord[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i]);
    const lat = Number(getValue(row, "lat"));
    const lng = Number(getValue(row, "lng"));
    const population = Number(getValue(row, "population"));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      continue;
    }

    records.push({
      city: getValue(row, "city"),
      state_id: getValue(row, "state_id"),
      county_name: getValue(row, "county_name"),
      lat,
      lng,
      population: Number.isNaN(population) ? 0 : population,
      zips: getValue(row, "zips")
    });
  }

  cachedCityRecords = records;
  return cachedCityRecords;
}

async function buildZipIndex(logger: LoggerLike): Promise<Map<string, CityRecord>> {
  if (cachedZipIndex) {
    return cachedZipIndex;
  }

  const records = await loadCityDataset(logger);
  const zipIndex = new Map<string, CityRecord>();

  for (const record of records) {
    if (!record.zips) {
      continue;
    }
    const zips = record.zips.split(/\s+/).filter(Boolean);
    for (const zip of zips) {
      const existing = zipIndex.get(zip);
      if (!existing || record.population > existing.population) {
        zipIndex.set(zip, record);
      }
    }
  }

  cachedZipIndex = zipIndex;
  return zipIndex;
}

export async function resolveZipLocation(
  zipCode: string,
  preferredCity: string | null | undefined,
  preferredState: string | null | undefined,
  logger: LoggerLike
): Promise<CityRecord | null> {
  const normalizedCity = preferredCity?.trim().toLowerCase();
  const normalizedState = preferredState?.trim().toUpperCase();

  if (normalizedCity) {
    const records = await loadCityDataset(logger);
    const matches = records.filter((record) => {
      if (!record.zips) {
        return false;
      }
      if (normalizedState && record.state_id !== normalizedState) {
        return false;
      }
      const cityMatch = record.city.trim().toLowerCase() === normalizedCity;
      if (!cityMatch) {
        return false;
      }
      return record.zips.split(/\s+/).includes(zipCode);
    });

    if (matches.length > 0) {
      return matches.slice().sort((a, b) => b.population - a.population)[0];
    }
  }

  const zipIndex = await buildZipIndex(logger);
  return zipIndex.get(zipCode) ?? null;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export class DistanceCache {
  private cache = new Map<string, number>();

  constructor(
    private originLat: number,
    private originLng: number
  ) {}

  getDistanceKm(lat: number, lng: number): number {
    const key = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const distance = haversineKm(this.originLat, this.originLng, lat, lng);
    this.cache.set(key, distance);
    return distance;
  }
}

export class ServiceAreaDistanceCache {
  private cache = new Map<string, number>();

  constructor(private centers: CityRecord[]) {}

  getDistanceKm(lat: number, lng: number): number {
    const key = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const distance = this.centers.reduce((min, center) => {
      const value = haversineKm(center.lat, center.lng, lat, lng);
      return value < min ? value : min;
    }, Number.POSITIVE_INFINITY);

    this.cache.set(key, distance);
    return distance;
  }
}

function normalizeServiceAreaName(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveServiceAreaCenters(
  serviceAreas: string[] | null | undefined,
  location: CityRecord,
  records: CityRecord[]
): CityRecord[] | null {
  if (!serviceAreas || serviceAreas.length === 0) {
    return null;
  }

  const normalizedServiceAreas = serviceAreas
    .map((value) => value.trim())
    .filter(Boolean);

  if (normalizedServiceAreas.length === 0) {
    return null;
  }

  const byCity = new Map<string, CityRecord[]>();
  for (const record of records) {
    const key = normalizeServiceAreaName(record.city);
    const existing = byCity.get(key);
    if (existing) {
      existing.push(record);
    } else {
      byCity.set(key, [record]);
    }
  }

  const centers: CityRecord[] = [];
  for (const area of normalizedServiceAreas) {
    const [cityPart, statePart] = area.split(",").map((part) => part.trim());
    const cityKey = normalizeServiceAreaName(cityPart || area);
    const candidates = byCity.get(cityKey);
    if (!candidates || candidates.length === 0) {
      continue;
    }

    const withState = statePart
      ? candidates.filter(
          (record) => record.state_id.toLowerCase() === statePart.toLowerCase()
        )
      : candidates;

    const sameState = withState.filter((record) => record.state_id === location.state_id);
    const pool = sameState.length > 0 ? sameState : withState;
    const selected = pool.slice().sort((a, b) => b.population - a.population)[0];

    if (selected) {
      centers.push(selected);
    }
  }

  return centers.length > 0 ? centers : null;
}
