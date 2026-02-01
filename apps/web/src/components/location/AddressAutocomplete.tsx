"use client";

import * as React from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { toast } from "sonner";
import { logger as baseLogger, createChildLogger } from "@web/src/lib/logger";

const logger = createChildLogger(baseLogger, {
  module: "address-autocomplete"
});

interface AddressAutocompleteProps {
  value: string;
  onChange: (nextValue: string) => void;
  apiKey: string;
  placeholder?: string;
  className?: string;
  country?: string;
  onSelectAddress?: (selection: {
    formattedAddress: string;
    placeId: string;
    addressComponents?: google.maps.GeocoderAddressComponent[];
  }) => void;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  apiKey,
  placeholder = "123 Market Street, Seattle WA",
  className,
  country = "us",
  onSelectAddress
}: AddressAutocompleteProps) => {
  const [inputValue, setInputValue] = React.useState(value ?? "");
  const [suggestions, setSuggestions] = React.useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const autocompleteService =
    React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = React.useRef<google.maps.places.PlacesService | null>(
    null
  );
  const blurTimeoutRef = React.useRef<number | null>(null);

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
    setInputValue(value ?? "");
  }, [value]);

  const fetchSuggestions = React.useCallback(
    async (query: string) => {
      if (!autocompleteService.current || !query.trim()) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const result = await autocompleteService.current.getPlacePredictions({
          input: query,
          types: ["address"],
          componentRestrictions: { country }
        });

        setSuggestions(result?.predictions || []);
      } catch (error) {
        logger.error(error, "Error fetching address suggestions");
        toast.error("Error fetching address suggestions.");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [country]
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (inputValue) {
        fetchSuggestions(inputValue);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [inputValue, fetchSuggestions]);

  const handleSelectPlace = (
    prediction: google.maps.places.AutocompletePrediction
  ) => {
    if (!placesService.current) {
      const fallback = prediction.description ?? inputValue;
      setInputValue(fallback);
      onChange(fallback);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address", "place_id", "address_components"]
      },
      (place, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place
        ) {
          const formattedAddress =
            place.formatted_address ?? prediction.description ?? inputValue;
          setInputValue(formattedAddress);
          onChange(formattedAddress);
          onSelectAddress?.({
            formattedAddress,
            placeId: place.place_id || prediction.place_id,
            addressComponents: place.address_components || []
          });
        } else {
          const fallback = prediction.description ?? inputValue;
          setInputValue(fallback);
          onChange(fallback);
        }
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
      }
    );
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            setInputValue(nextValue);
            onChange(nextValue);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (inputValue) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            if (blurTimeoutRef.current) {
              window.clearTimeout(blurTimeoutRef.current);
            }
            blurTimeoutRef.current = window.setTimeout(() => {
              setShowSuggestions(false);
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

        {!!inputValue && !isLoading && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-secondary/20"
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {showSuggestions && suggestions.length > 0 && (
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
