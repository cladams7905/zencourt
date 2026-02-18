import * as React from "react";
import { toast } from "sonner";
import { logger as baseLogger, createChildLogger } from "@web/src/lib/core/logging/logger";
import { AUTOCOMPLETE_DEBOUNCE_MS, BLUR_DISMISS_DELAY_MS } from "@web/src/components/location/shared/constants";
import type { AddressSelection } from "@web/src/components/location/shared/types";
import { useGooglePlacesServices } from "@web/src/components/location/domain/hooks/useGooglePlacesServices";

const logger = createChildLogger(baseLogger, {
  module: "address-autocomplete"
});

interface UseAddressAutocompleteArgs {
  value: string;
  onChange: (nextValue: string) => void;
  apiKey: string;
  country: string;
  onSelectAddress?: (selection: AddressSelection) => void;
}

export const useAddressAutocomplete = ({
  value,
  onChange,
  apiKey,
  country,
  onSelectAddress
}: UseAddressAutocompleteArgs) => {
  const [inputValue, setInputValue] = React.useState(value ?? "");
  const [suggestions, setSuggestions] = React.useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [shouldFetch, setShouldFetch] = React.useState(false);
  const blurTimeoutRef = React.useRef<number | null>(null);
  const { isScriptLoaded, autocompleteService, placesService } =
    useGooglePlacesServices(apiKey);

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
    [autocompleteService, country]
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (inputValue && shouldFetch && showSuggestions) {
        void fetchSuggestions(inputValue);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [fetchSuggestions, inputValue, shouldFetch, showSuggestions]);

  const handleSelectSuggestion = React.useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      if (!placesService.current) {
        const fallback = prediction.description ?? inputValue;
        setInputValue(fallback);
        onChange(fallback);
        setSuggestions([]);
        setShowSuggestions(false);
        setShouldFetch(false);
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
          setShouldFetch(false);
          setIsLoading(false);
        }
      );
    },
    [inputValue, onChange, onSelectAddress, placesService]
  );

  const handleClear = React.useCallback(() => {
    setInputValue("");
    onChange("");
    setSuggestions([]);
    setShowSuggestions(false);
    setShouldFetch(false);
  }, [onChange]);

  const handleInputChange = React.useCallback(
    (nextValue: string) => {
      setInputValue(nextValue);
      onChange(nextValue);
      setShowSuggestions(true);
      setShouldFetch(true);
    },
    [onChange]
  );

  const handleFocus = React.useCallback(() => {
    if (inputValue) {
      setShowSuggestions(true);
    }
  }, [inputValue]);

  const handleBlur = React.useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
    }

    blurTimeoutRef.current = window.setTimeout(() => {
      setShowSuggestions(false);
    }, BLUR_DISMISS_DELAY_MS);
  }, []);

  return {
    inputValue,
    suggestions,
    isLoading,
    isScriptLoaded,
    showSuggestions,
    showClear: Boolean(inputValue) && !isLoading,
    shouldShowSuggestions: showSuggestions && suggestions.length > 0,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleClear,
    handleSelectSuggestion
  };
};
