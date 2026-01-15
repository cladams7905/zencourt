"use client";

import * as React from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

export interface LocationData {
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  placeId: string;
  formattedAddress: string;
}

interface LocationAutocompleteProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  apiKey: string;
  placeholder?: string;
  className?: string;
  autoLocate?: boolean;
}

export const LocationAutocomplete = ({
  value,
  onChange,
  apiKey,
  placeholder = "Start typing your city...",
  className,
  autoLocate = true
}: LocationAutocompleteProps) => {
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [hasAttemptedAutoLocate, setHasAttemptedAutoLocate] =
    React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteService =
    React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = React.useRef<google.maps.places.PlacesService | null>(
    null
  );

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

  const parseAddressComponents = React.useCallback(
    (
      components: google.maps.GeocoderAddressComponent[]
    ): Pick<LocationData, "city" | "state" | "country" | "postalCode"> => {
      let city = "";
      let state = "";
      let country = "";
      let postalCode = "";

      for (const component of components) {
        if (component.types.includes("locality")) {
          city = component.long_name;
        } else if (component.types.includes("administrative_area_level_1")) {
          state = component.short_name;
        } else if (component.types.includes("country")) {
          country = component.long_name;
        } else if (component.types.includes("postal_code")) {
          postalCode = component.long_name;
        }
      }

      return { city, state, country, postalCode };
    },
    []
  );

  const formatLocationDisplay = React.useCallback(
    (location: LocationData): string => {
      // For US locations: "City, State"
      // For international: "City, Country"
      if (location.country === "United States") {
        return location.state
          ? `${location.city}, ${location.state}`
          : location.city;
      }
      return `${location.city}, ${location.country}`;
    },
    []
  );

  // Auto-locate the user once when possible
  React.useEffect(() => {
    if (
      !autoLocate ||
      hasAttemptedAutoLocate ||
      value ||
      !isScriptLoaded ||
      !window.google
    ) {
      return;
    }

    if (!navigator.geolocation) {
      setHasAttemptedAutoLocate(true);
      return;
    }

    setHasAttemptedAutoLocate(true);
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geocoder = new window.google.maps.Geocoder();
        const locationLatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        geocoder.geocode({ location: locationLatLng }, (results, status) => {
          setIsLoading(false);
          if (
            status === window.google.maps.GeocoderStatus.OK &&
            results &&
            results[0]
          ) {
            const result = results[0];
            const { city, state, country, postalCode } = parseAddressComponents(
              result.address_components || []
            );

            const locationData = {
              city,
              state,
              country,
              postalCode,
              placeId: result.place_id || "",
              formattedAddress: result.formatted_address || ""
            };

            onChange(locationData);

            const displayText = formatLocationDisplay(locationData);
            setInputValue(displayText);
            setSuggestions([]);
            setShowSuggestions(false);
          }
        });
      },
      () => {
        setIsLoading(false);
      },
      {
        maximumAge: 300000,
        timeout: 10000
      }
    );
  }, [
    autoLocate,
    hasAttemptedAutoLocate,
    isScriptLoaded,
    onChange,
    parseAddressComponents,
    formatLocationDisplay,
    value
  ]);

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
        types: ["(cities)"]
      });

      setSuggestions(result?.predictions || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
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
  const handleSelectPlace = (
    prediction: google.maps.places.AutocompletePrediction
  ) => {
    if (!placesService.current) return;

    setIsLoading(true);
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["address_components", "formatted_address", "place_id"]
      },
      (place, status) => {
        setIsLoading(false);
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place
        ) {
          const { city, state, country, postalCode } = parseAddressComponents(
            place.address_components || []
          );

          const locationData = {
            city,
            state,
            country,
            postalCode,
            placeId: place.place_id || "",
            formattedAddress: place.formatted_address || ""
          };

          onChange(locationData);

          const displayText = formatLocationDisplay(locationData);
          setInputValue(displayText);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  };

  // Handle clear
  const handleClear = () => {
    onChange(null);
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

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
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (!value) {
              setShowSuggestions(true);
            }
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
