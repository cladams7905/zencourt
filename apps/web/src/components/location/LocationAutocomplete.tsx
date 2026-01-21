"use client";

import * as React from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { logger as baseLogger, createChildLogger } from "@web/src/lib/logger";
import {
  loadCityDataset,
  normalizeCountyName
} from "@web/src/lib/locationHelpers";
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

const SERVICE_AREA_RADIUS_KM = 35;
const MAX_SERVICE_AREAS = 3;

interface LocationAutocompleteProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  apiKey: string;
  placeholder?: string;
  initialValue?: string;
  className?: string;
  autoFillFromGeolocation?: boolean;
}

export const LocationAutocomplete = ({
  value,
  onChange,
  apiKey,
  placeholder = "Enter your ZIP code",
  initialValue,
  className,
  autoFillFromGeolocation = false
}: LocationAutocompleteProps) => {
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteService =
    React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = React.useRef<google.maps.places.PlacesService | null>(
    null
  );
  const blurTimeoutRef = React.useRef<number | null>(null);
  const hasUserEditedRef = React.useRef(false);
  const hasAutoFilledRef = React.useRef(false);

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

      const primary =
        candidates
          .slice()
          .sort((a, b) => a.distance - b.distance)[0]?.record ??
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
    },
    [haversineKm]
  );

  const extractZip = React.useCallback((zips: string): string => {
    const match = zips.match(/\b\d{5}\b/);
    return match ? match[0] : "";
  }, []);

  const resolveZipFromDataset = React.useCallback(
    async (city: string, state: string): Promise<string> => {
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
      return extractZip(best?.zips ?? "");
    },
    [extractZip]
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
          county = normalizeCountyName(component.long_name);
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
        types: ["(regions)"],
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

  // Handle place selection
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
              resolvedCounty = normalizeCountyName(county);
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

  const applyLocationSelection = React.useCallback(
    async (
      locationData: LocationData,
      serviceAreas: string[],
      resolvedCounty?: string
    ) => {
      const resolvedPostal =
        locationData.postalCode ||
        (await resolveZipFromDataset(locationData.city, locationData.state));

      if (!resolvedPostal) {
        setValidationError("Please include a ZIP code to continue.");
        const displayText = formatLocationDisplay(locationData);
        setInputValue(displayText);
        setSuggestions([]);
        setShowSuggestions(false);
        onChange(null);
        return;
      }

      const nextLocation = {
        ...locationData,
        postalCode: resolvedPostal,
        county: resolvedCounty || locationData.county,
        serviceAreas
      };
      onChange(nextLocation);
      const displayText = formatLocationDisplay(nextLocation);
      setInputValue(displayText);
      setSuggestions([]);
      setShowSuggestions(false);
      setValidationError(null);
    },
    [formatLocationDisplay, onChange, resolveZipFromDataset]
  );

  React.useEffect(() => {
    if (
      !autoFillFromGeolocation ||
      hasAutoFilledRef.current ||
      value ||
      inputValue ||
      hasUserEditedRef.current ||
      !isScriptLoaded ||
      !window.google
    ) {
      return;
    }

    if (!("geolocation" in navigator) || !navigator.geolocation) {
      return;
    }

    hasAutoFilledRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          {
            location: { lat, lng }
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

            const geometryLocation =
              result.geometry?.location ??
              new window.google.maps.LatLng(lat, lng);

            Promise.all([
              resolveServiceAreasFromDataset({
                state,
                lat,
                lng
              }),
              resolveGeoFallback(geometryLocation)
            ]).then(([datasetResult, fallback]) => {
              const fallbackAreas =
                datasetResult?.serviceAreas &&
                datasetResult.serviceAreas.length > 0
                  ? datasetResult.serviceAreas
                  : fallback.serviceAreas.length > 0
                    ? fallback.serviceAreas
                    : fallback.county
                      ? [fallback.county]
                      : [];
              const resolvedCounty =
                county || datasetResult?.county || fallback.county;
              applyLocationSelection(
                locationData,
                fallbackAreas,
                resolvedCounty
              );
            });
          }
        );
      },
      () => {},
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 0
      }
    );
  }, [
    autoFillFromGeolocation,
    inputValue,
    isScriptLoaded,
    parseAddressComponents,
    resolveGeoFallback,
    resolveServiceAreasFromDataset,
    value,
    applyLocationSelection
  ]);

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

          const geometryLocation = place.geometry?.location;
          if (geometryLocation) {
            Promise.all([
              resolveServiceAreasFromDataset({
                state,
                lat: geometryLocation.lat(),
                lng: geometryLocation.lng()
              }),
              resolveGeoFallback(geometryLocation)
            ]).then(([datasetResult, fallback]) => {
              const fallbackAreas =
                datasetResult?.serviceAreas &&
                datasetResult.serviceAreas.length > 0
                  ? datasetResult.serviceAreas
                  : fallback.serviceAreas.length > 0
                    ? fallback.serviceAreas
                    : fallback.county
                      ? [fallback.county]
                      : [];
              const resolvedCounty =
                county || datasetResult?.county || fallback.county;
              applyLocationSelection(
                locationData,
                fallbackAreas,
                resolvedCounty
              );
            });
          } else {
            applyLocationSelection(locationData, []);
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
    setValidationError(null);
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
              resolveServiceAreasFromDataset({
                state,
                lat: geometryLocation.lat(),
                lng: geometryLocation.lng()
              }),
              resolveGeoFallback(geometryLocation)
            ]).then(([datasetResult, fallback]) => {
              const fallbackAreas =
                datasetResult?.serviceAreas &&
                datasetResult.serviceAreas.length > 0
                  ? datasetResult.serviceAreas
                  : fallback.serviceAreas.length > 0
                    ? fallback.serviceAreas
                    : fallback.county
                      ? [fallback.county]
                      : [];
              const resolvedCounty =
                county || datasetResult?.county || fallback.county;
              applyLocationSelection(
                locationData,
                fallbackAreas,
                resolvedCounty
              );
            });
          } else {
            applyLocationSelection(locationData, []);
          }
        }
      );
    },
    [
      applyLocationSelection,
      parseAddressComponents,
      resolveGeoFallback,
      resolveServiceAreasFromDataset
    ]
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
            if (validationError) {
              setValidationError(null);
            }
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
      {validationError && (
        <p className="mt-2 text-xs text-destructive">{validationError}</p>
      )}
    </div>
  );
};
