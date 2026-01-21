"use client";

import * as React from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { createChildLogger } from "@shared/utils";
import {logger as baseLogger} from "@web/src/lib/logger";
import { toast } from "sonner";

const logger = createChildLogger(baseLogger, {
  module: "location-autocomplete"
});


export interface LocationData {
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  county?: string;
  serviceAreas?: string[];
  placeId: string;
  formattedAddress: string;
}

type CityRecord = {
  city: string;
  city_ascii: string;
  state_id: string;
  county_name: string;
  lat: number;
  lng: number;
  population: number;
  zips: string;
};

const SERVICE_AREA_RADIUS_KM = 20;
const MAX_SERVICE_AREAS = 3;

interface LocationAutocompleteProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  apiKey: string;
  placeholder?: string;
  initialValue?: string;
  className?: string;
}

export const LocationAutocomplete = ({
  value,
  onChange,
  apiKey,
  placeholder = "Enter your ZIP code",
  initialValue,
  className
}: LocationAutocompleteProps) => {
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteService =
    React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = React.useRef<google.maps.places.PlacesService | null>(
    null
  );
  const blurTimeoutRef = React.useRef<number | null>(null);
  const hasUserEditedRef = React.useRef(false);

  const cityDataRef = React.useRef<CityRecord[] | null>(null);
  const cityDataPromiseRef = React.useRef<Promise<CityRecord[]> | null>(null);

  // Load Google Maps script
  React.useEffect(() => {
    if (typeof window !== "undefined" && !window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsScriptLoaded(true);
      document.head.appendChild(script);
    } else if (window.google) {
      setIsScriptLoaded(true);
    }
  }, [apiKey]);

  // Initialize services
  React.useEffect(() => {
    if (isScriptLoaded && window.google) {
      autocompleteService.current =
        new window.google.maps.places.AutocompleteService();
      const mapDiv = document.createElement("div");
      placesService.current = new window.google.maps.places.PlacesService(
        mapDiv
      );
    }
  }, [isScriptLoaded]);

  React.useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!value && !inputValue && initialValue && !hasUserEditedRef.current) {
      setInputValue(initialValue);
    }
  }, [initialValue, inputValue, value]);

  const parseCsvLine = React.useCallback((line: string): string[] => {
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
  }, []);

  const loadCityDataset = React.useCallback(async (): Promise<CityRecord[]> => {
    if (cityDataRef.current) {
      return cityDataRef.current;
    }
    if (cityDataPromiseRef.current) {
      return cityDataPromiseRef.current;
    }

    cityDataPromiseRef.current = (async () => {
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

      cityDataRef.current = records;
      return records;
    })();

    const records = await cityDataPromiseRef.current;
    cityDataPromiseRef.current = null;
    return records;
  }, [parseCsvLine]);

  const haversineKm = React.useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const toRad = (value: number) => (value * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  const resolveServiceAreasFromDataset = React.useCallback(
    async (input: {
      city: string;
      state: string;
      postalCode?: string;
    }): Promise<{ county: string; serviceAreas: string[] } | null> => {
      const records = await loadCityDataset();
      if (records.length === 0) {
        console.debug("location-dataset:empty");
        return null;
      }

      const zipToken = input.postalCode?.trim() ?? "";
      const cityLower = input.city.toLowerCase();
      const stateUpper = input.state.toUpperCase();

      const zipMatch = zipToken
        ? records.filter((record) => {
            const zips = ` ${record.zips} `;
            return (
              record.state_id === stateUpper &&
              zips.includes(` ${zipToken} `)
            );
          })
        : [];

      console.debug("location-dataset:zip-match", {
        zipToken,
        stateUpper,
        city: input.city,
        matches: zipMatch.length
      });

      const cityMatch =
        zipMatch.length > 0
          ? zipMatch
          : records.filter((record) => {
              const name = (record.city_ascii || record.city).toLowerCase();
              return record.state_id === stateUpper && name === cityLower;
            });

      if (cityMatch.length === 0) {
        console.debug("location-dataset:city-match-empty", {
          city: input.city,
          state: input.state
        });
        return null;
      }

      const primary =
        zipMatch.length > 0
          ? zipMatch
              .filter((record) => {
                const name = (record.city_ascii || record.city).toLowerCase();
                return name === cityLower;
              })
              .sort((a, b) => b.population - a.population)[0] ??
            zipMatch.sort((a, b) => b.population - a.population)[0]
          : cityMatch.sort((a, b) => b.population - a.population)[0];
      if (!zipMatch.length) {
        console.debug("location-dataset:zip-miss", {
          city: input.city,
          state: input.state,
          primaryCity: primary?.city
        });
        return null;
      }
      console.debug("location-dataset:primary", {
        primaryCity: primary.city,
        county: primary.county_name,
        population: primary.population,
        lat: primary.lat,
        lng: primary.lng
      });
      const county = primary.county_name;
      const baseLat = primary.lat;
      const baseLng = primary.lng;

      const candidates = records.filter(
        (record) =>
          record.state_id === stateUpper &&
          record.county_name === county &&
          record.city !== primary.city &&
          haversineKm(baseLat, baseLng, record.lat, record.lng) <=
            SERVICE_AREA_RADIUS_KM
      );

      const serviceAreas = candidates
        .sort((a, b) => b.population - a.population)
        .slice(0, MAX_SERVICE_AREAS)
        .map((record) => record.city);

      if (
        primary.city &&
        !serviceAreas.some(
          (name) => name.toLowerCase() === primary.city.toLowerCase()
        )
      ) {
        serviceAreas.unshift(primary.city);
      }

      console.debug("location-dataset:service-areas", {
        county,
        radiusKm: SERVICE_AREA_RADIUS_KM,
        candidates: candidates.length,
        serviceAreas
      });

      return { county, serviceAreas };
    },
    [haversineKm, loadCityDataset]
  );

  const parseAddressComponents = React.useCallback(
    (
      components: google.maps.GeocoderAddressComponent[]
    ): Pick<
      LocationData,
      "city" | "state" | "country" | "postalCode" | "county"
    > => {
      let city = "";
      let state = "";
      let country = "";
      let postalCode = "";
      let county = "";
      for (const component of components) {
        if (component.types.includes("locality")) {
          city = component.long_name;
        } else if (component.types.includes("administrative_area_level_1")) {
          state = component.short_name;
        } else if (component.types.includes("administrative_area_level_2")) {
          county = component.long_name;
        } else if (component.types.includes("country")) {
          country = component.long_name;
        } else if (component.types.includes("postal_code")) {
          postalCode = component.long_name;
        }
      }

      return { city, state, country, postalCode, county };
    },
    []
  );

  const formatLocationDisplay = React.useCallback(
    (location: LocationData): string => {
      // For US locations: "City, State"
      // For international: "City, Country"
      if (location.country === "United States") {
        const cityState = [location.city, location.state]
          .filter(Boolean)
          .join(", ");
        return [cityState, location.postalCode].filter(Boolean).join(" ");
      }
      return `${location.city}, ${location.country}`;
    },
    []
  );

  // Fetch suggestions
  const fetchSuggestions = React.useCallback(async (query: string) => {
    if (!autocompleteService.current || !query.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await autocompleteService.current.getPlacePredictions({
        input: query,
        types: ["postal_code"],
        componentRestrictions: { country: "us" }
      });

      setSuggestions(result?.predictions || []);
    } catch (error) {
      logger.error(error, "Error fetching suggestions");
      toast.error("Error fetching suggestions: " + error)
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce input changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue && !value) {
        fetchSuggestions(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, value, fetchSuggestions]);

  // Parse address components

  // Handle place selection
  const resolveNearbyCities = React.useCallback(
    async (input: {
      city: string;
      state: string;
      postalCode?: string;
    }): Promise<{ county: string; serviceAreas: string[] } | null> => {
      const datasetResult = await resolveServiceAreasFromDataset(input);
      if (datasetResult) {
        return datasetResult;
      }
      return null;
    },
    [resolveServiceAreasFromDataset]
  );

  const resolveGeoFallback = React.useCallback(
    (location: google.maps.LatLng): Promise<{
      county: string;
      serviceAreas: string[];
    }> => {
      return new Promise((resolve) => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location }, (results, status) => {
          if (
            status !== window.google.maps.GeocoderStatus.OK ||
            !results?.length
          ) {
            resolve({ county: "", serviceAreas: [] });
            return;
          }
          const fallbackCities = new Set<string>();
          let resolvedCounty = "";
          for (const result of results) {
            const components = result.address_components || [];
            const { county } = parseAddressComponents(components);
            if (!resolvedCounty && county) {
              resolvedCounty = county;
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
            serviceAreas: Array.from(fallbackCities).slice(0, 3)
          });
        });
      });
    },
    [parseAddressComponents]
  );

  const handleSelectPlace = (
    prediction: google.maps.places.AutocompletePrediction
  ) => {
    if (!placesService.current) return;

    setIsLoading(true);
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: [
          "address_components",
          "formatted_address",
          "place_id",
          "geometry"
        ]
      },
      (place, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place
        ) {
          const { city, state, country, postalCode, county } =
            parseAddressComponents(place.address_components || []);

          const locationData: LocationData = {
            city,
            state,
            country,
            postalCode,
            county,
            placeId: place.place_id || "",
            formattedAddress: place.formatted_address || ""
          };

          const finalize = (
            nextPostal: string,
            serviceAreas: string[],
            resolvedCounty?: string
          ) => {
            const nextLocation = {
              ...locationData,
              postalCode: locationData.postalCode || nextPostal,
              county: resolvedCounty || locationData.county,
              serviceAreas: serviceAreas.filter(
                (name) => name.toLowerCase() !== city.toLowerCase()
              )
            };
            onChange(nextLocation);
            const displayText = formatLocationDisplay(nextLocation);
            setInputValue(displayText);
            setSuggestions([]);
            setShowSuggestions(false);
          };

          const geometryLocation = place.geometry?.location;
          if (geometryLocation) {
            Promise.all([
              resolveNearbyCities({
                city,
                state,
                postalCode
              }),
              resolveGeoFallback(geometryLocation)
            ]).then(([datasetResult, fallback]) => {
              const fallbackAreas =
                datasetResult?.serviceAreas && datasetResult.serviceAreas.length > 0
                  ? datasetResult.serviceAreas
                  : fallback.serviceAreas.length > 0
                    ? fallback.serviceAreas
                    : fallback.county
                      ? [fallback.county]
                      : [];
              const resolvedCounty =
                county || datasetResult?.county || fallback.county;
              finalize("", fallbackAreas, resolvedCounty);
            });
          } else {
            finalize("", []);
          }
        }
        setIsLoading(false);
      }
    );
  };

  // Handle clear
  const handleClear = () => {
    hasUserEditedRef.current = true;
    onChange(null);
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const resolvePostalEntry = React.useCallback(
    (postalInput: string) => {
      if (!window.google) {
        return;
      }
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        {
          address: postalInput,
          componentRestrictions: { country: "us" }
        },
        (results, status) => {
          if (
            status !== window.google.maps.GeocoderStatus.OK ||
            !results?.length
          ) {
            return;
          }
          const result = results[0];
          const { city, state, country, postalCode, county } =
            parseAddressComponents(result.address_components || []);
          const locationData: LocationData = {
            city,
            state,
            country,
            postalCode,
            county,
            placeId: result.place_id || "",
            formattedAddress: result.formatted_address || ""
          };
          const geometryLocation = result.geometry?.location;
          if (geometryLocation) {
            Promise.all([
              resolveNearbyCities({
                city,
                state,
                postalCode
              }),
              resolveGeoFallback(geometryLocation)
            ]).then(([datasetResult, fallback]) => {
              const fallbackAreas =
                datasetResult?.serviceAreas && datasetResult.serviceAreas.length > 0
                  ? datasetResult.serviceAreas
                  : fallback.serviceAreas.length > 0
                    ? fallback.serviceAreas
                    : fallback.county
                      ? [fallback.county]
                      : [];
              const resolvedCounty =
                county || datasetResult?.county || fallback.county;
              const filteredAreas = fallbackAreas.filter(
                (name) => name.toLowerCase() !== city.toLowerCase()
              );
              onChange({
                ...locationData,
                county: resolvedCounty || locationData.county,
                serviceAreas: filteredAreas
              });
              setInputValue(formatLocationDisplay(locationData));
              setSuggestions([]);
              setShowSuggestions(false);
            });
          } else {
            onChange({ ...locationData, serviceAreas: [] });
            setInputValue(formatLocationDisplay(locationData));
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    },
    [formatLocationDisplay, onChange, parseAddressComponents, resolveNearbyCities, resolveGeoFallback]
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value ? formatLocationDisplay(value) : inputValue}
          onChange={(e) => {
            if (value) {
              // If there's a selected value, clear it first
              onChange(null);
            }
            hasUserEditedRef.current = true;
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (!value) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            if (blurTimeoutRef.current) {
              window.clearTimeout(blurTimeoutRef.current);
            }
            if (value) {
              return;
            }
            blurTimeoutRef.current = window.setTimeout(() => {
              const trimmed = inputValue.trim();
              if (!trimmed) {
                return;
              }
              const normalized = trimmed.replace(/\s+/g, "");
              if (/^\d{5}(-\d{4})?$/.test(normalized)) {
                resolvePostalEntry(normalized);
              }
            }, 150);
          }}
          placeholder={placeholder}
          className="pr-8"
          disabled={!isScriptLoaded}
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {value && !isLoading && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-secondary/20"
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && !value && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                onClick={() => handleSelectPlace(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors flex items-start gap-3 border-b border-border last:border-0"
              >
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {suggestion.structured_formatting.main_text}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
