"use client";

import type { LocationData } from "../components/location/LocationAutocomplete";

export type CityRecord = {
  city: string;
  city_ascii: string;
  state_id: string;
  county_name: string;
  lat: number;
  lng: number;
  population: number;
  zips: string;
};

let cachedRecords: CityRecord[] | null = null;
let cachedPromise: Promise<CityRecord[]> | null = null;
const citySetByState = new Map<string, Set<string>>();
const countySetByState = new Map<string, Set<string>>();

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === "\"") {
        current += "\"";
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
};

export const loadCityDataset = async (): Promise<CityRecord[]> => {
  if (cachedRecords) {
    return cachedRecords;
  }
  if (cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = (async () => {
    const response = await fetch("/uscities.csv");
    const text = await response.text();
    const lines = text.split("\n").filter(Boolean);
    if (lines.length === 0) {
      return [];
    }

    const header = parseCsvLine(lines[0]);
    const headerIndex = new Map(
      header.map((key, index) => [key.trim(), index])
    );

    const getValue = (row: string[], key: string): string =>
      row[headerIndex.get(key) ?? -1] ?? "";

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
        city_ascii: getValue(row, "city_ascii"),
        state_id: getValue(row, "state_id"),
        county_name: getValue(row, "county_name"),
        lat,
        lng,
        population: Number.isNaN(population) ? 0 : population,
        zips: getValue(row, "zips")
      });
    }

    cachedRecords = records;
    cachedPromise = null;
    return records;
  })();

  return cachedPromise;
};

export const getCityNameSetForState = async (
  state: string
): Promise<Set<string>> => {
  const stateUpper = state.toUpperCase();
  const cached = citySetByState.get(stateUpper);
  if (cached) {
    return cached;
  }

  const records = await loadCityDataset();
  const citySet = new Set<string>();
  for (const record of records) {
    if (record.state_id !== stateUpper) {
      continue;
    }
    if (record.city) {
      citySet.add(record.city.toLowerCase());
    }
    if (record.city_ascii) {
      citySet.add(record.city_ascii.toLowerCase());
    }
  }

  citySetByState.set(stateUpper, citySet);
  return citySet;
};

export const normalizeCountyName = (county: string): string => {
  return county.replace(/\s+county$/i, "").trim();
};

export const getCountyNameSetForState = async (
  state: string
): Promise<Set<string>> => {
  const stateUpper = state.toUpperCase();
  const cached = countySetByState.get(stateUpper);
  if (cached) {
    return cached;
  }

  const records = await loadCityDataset();
  const countySet = new Set<string>();
  for (const record of records) {
    if (record.state_id !== stateUpper || !record.county_name) {
      continue;
    }
    const normalized = normalizeCountyName(record.county_name).toLowerCase();
    if (normalized) {
      countySet.add(normalized);
    }
  }

  countySetByState.set(stateUpper, countySet);
  return countySet;
};

export const formatLocationForStorage = (location: LocationData): string => {
  if (location.country === "United States") {
    const stateAndZip = [location.state, location.postalCode]
      .filter(Boolean)
      .join(" ");
    return [location.city, stateAndZip].filter(Boolean).join(", ");
  }

  return [location.city, location.country].filter(Boolean).join(", ");
};
