import {
  MAX_SERVICE_AREAS,
  SERVICE_AREA_RADIUS_KM
} from "@web/src/components/location/shared/constants";
import type {
  GeoFallbackResult,
  LocationData
} from "@web/src/components/location/shared/types";
import {
  extractZipFromZips,
  parseAddressComponents
} from "@web/src/components/location/domain/locationMappers";
import {
  loadCityDataset,
  normalizeCountyName
} from "@web/src/lib/locationHelpers";

const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radiusKm * c;
};

export const resolveServiceAreasFromDataset = async (input: {
  state: string;
  lat: number;
  lng: number;
}): Promise<{ county: string; serviceAreas: string[] } | null> => {
  const records = await loadCityDataset();
  if (records.length === 0) {
    return null;
  }

  const stateUpper = input.state.toUpperCase();
  const candidates = records
    .filter((record) => record.state_id === stateUpper)
    .map((record) => ({
      record,
      distance: haversineKm(input.lat, input.lng, record.lat, record.lng)
    }))
    .filter((entry) => entry.distance <= SERVICE_AREA_RADIUS_KM);

  if (candidates.length === 0) {
    return null;
  }

  const nearest = candidates.slice().sort((a, b) => a.distance - b.distance)[0]
    ?.record;
  const primary =
    nearest ??
    candidates.sort((a, b) => b.record.population - a.record.population)[0]
      ?.record;

  if (!primary) {
    return null;
  }

  const county = normalizeCountyName(primary.county_name);
  const serviceAreas = candidates
    .slice()
    .sort((a, b) => a.distance - b.distance)
    .reduce<string[]>((acc, entry) => {
      if (!acc.includes(entry.record.city)) {
        acc.push(entry.record.city);
      }
      return acc;
    }, [])
    .slice(0, MAX_SERVICE_AREAS);

  if (!serviceAreas.includes(primary.city)) {
    serviceAreas.unshift(primary.city);
  }

  return { county, serviceAreas };
};

export const resolveZipFromDataset = async (
  city: string,
  state: string
): Promise<string> => {
  if (!city || !state) {
    return "";
  }

  const records = await loadCityDataset();
  if (records.length === 0) {
    return "";
  }

  const cityLower = city.toLowerCase();
  const stateUpper = state.toUpperCase();
  const matches = records.filter((record) => {
    if (record.state_id !== stateUpper) {
      return false;
    }

    const name = (record.city_ascii || record.city).toLowerCase();
    return name === cityLower;
  });

  if (matches.length === 0) {
    return "";
  }

  const best = matches.sort((a, b) => b.population - a.population)[0];
  return extractZipFromZips(best?.zips ?? "");
};

export const resolveGeoFallback = (
  location: google.maps.LatLng
): Promise<GeoFallbackResult> => {
  return new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location }, (results, status) => {
      if (status !== window.google.maps.GeocoderStatus.OK || !results?.length) {
        resolve({ county: "", serviceAreas: [] });
        return;
      }

      const fallbackCities = new Set<string>();
      let resolvedCounty = "";

      for (const result of results) {
        const components = result.address_components || [];
        const parsed = parseAddressComponents(components);
        if (!resolvedCounty && parsed.county) {
          resolvedCounty = normalizeCountyName(parsed.county);
        }

        for (const component of components) {
          if (
            component.types.includes("locality") ||
            component.types.includes("sublocality") ||
            component.types.includes("postal_town")
          ) {
            fallbackCities.add(component.long_name);
          }
        }
      }

      resolve({
        county: resolvedCounty,
        serviceAreas: Array.from(fallbackCities).slice(0, MAX_SERVICE_AREAS)
      });
    });
  });
};

export const buildFallbackServiceAreas = (
  datasetResult: { county: string; serviceAreas: string[] } | null,
  fallback: GeoFallbackResult
): string[] => {
  if (datasetResult?.serviceAreas && datasetResult.serviceAreas.length > 0) {
    return datasetResult.serviceAreas;
  }
  if (fallback.serviceAreas.length > 0) {
    return fallback.serviceAreas;
  }
  if (fallback.county) {
    return [fallback.county];
  }
  return [];
};

export const buildLocationDataFromPlace = (input: {
  addressComponents: google.maps.GeocoderAddressComponent[];
  placeId: string;
  formattedAddress: string;
}): LocationData => {
  const parsed = parseAddressComponents(input.addressComponents);

  return {
    ...parsed,
    placeId: input.placeId,
    formattedAddress: input.formattedAddress
  };
};
