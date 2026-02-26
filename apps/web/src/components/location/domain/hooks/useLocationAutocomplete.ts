import * as React from "react";
import { toast } from "sonner";
import { logger as baseLogger, createChildLogger } from "@shared/utils/logger";
import {
  AUTOCOMPLETE_DEBOUNCE_MS,
  BLUR_DISMISS_DELAY_MS,
  GEOLOCATION_TIMEOUT_MS
} from "@web/src/components/location/shared/constants";
import type { LocationData } from "@web/src/components/location/shared/types";
import {
  formatLocationDisplay,
  isPostalCodeInput
} from "@web/src/components/location/domain/locationMappers";
import {
  buildLocationDataFromPlace,
  buildFallbackServiceAreas,
  resolveGeoFallback,
  resolveServiceAreasFromDataset,
  resolveZipFromDataset
} from "@web/src/components/location/domain/locationResolutionService";
import { useGooglePlacesServices } from "@web/src/components/location/domain/hooks/useGooglePlacesServices";

const logger = createChildLogger(baseLogger, {
  module: "location-autocomplete"
});

interface UseLocationAutocompleteArgs {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  apiKey: string;
  initialValue?: string;
  autoFillFromGeolocation: boolean;
}

export const useLocationAutocomplete = ({
  value,
  onChange,
  apiKey,
  initialValue,
  autoFillFromGeolocation
}: UseLocationAutocompleteArgs) => {
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );

  const inputRef = React.useRef<HTMLInputElement>(null);
  const blurTimeoutRef = React.useRef<number | null>(null);
  const hasUserEditedRef = React.useRef(false);
  const hasAutoFilledRef = React.useRef(false);

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
    if (!value && !inputValue && initialValue && !hasUserEditedRef.current) {
      setInputValue(initialValue);
    }
  }, [initialValue, inputValue, value]);

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
          types: ["(regions)"],
          componentRestrictions: { country: "us" }
        });

        setSuggestions(result?.predictions || []);
      } catch (error) {
        logger.error(error, "Error fetching suggestions");
        toast.error("Error fetching suggestions.");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [autocompleteService]
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (inputValue && !value) {
        void fetchSuggestions(inputValue);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [fetchSuggestions, inputValue, value]);

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
        setInputValue(formatLocationDisplay(locationData));
        setSuggestions([]);
        setShowSuggestions(false);
        onChange(null);
        return;
      }

      const nextLocation: LocationData = {
        ...locationData,
        postalCode: resolvedPostal,
        county: resolvedCounty || locationData.county,
        serviceAreas
      };

      onChange(nextLocation);
      setInputValue(formatLocationDisplay(nextLocation));
      setSuggestions([]);
      setShowSuggestions(false);
      setValidationError(null);
    },
    [onChange]
  );

  const resolveAndApplyLocation = React.useCallback(
    async (locationData: LocationData, geometryLocation?: google.maps.LatLng) => {
      if (!geometryLocation) {
        await applyLocationSelection(locationData, []);
        return;
      }

      const [datasetResult, fallback] = await Promise.all([
        resolveServiceAreasFromDataset({
          state: locationData.state,
          lat: geometryLocation.lat(),
          lng: geometryLocation.lng()
        }),
        resolveGeoFallback(geometryLocation)
      ]);

      const fallbackAreas = buildFallbackServiceAreas(datasetResult, fallback);
      const resolvedCounty =
        locationData.county || datasetResult?.county || fallback.county;

      await applyLocationSelection(locationData, fallbackAreas, resolvedCounty);
    },
    [applyLocationSelection]
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

        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status !== window.google.maps.GeocoderStatus.OK || !results?.length) {
            return;
          }

          const result = results[0];
          const locationData = buildLocationDataFromPlace({
            addressComponents: result.address_components || [],
            placeId: result.place_id || "",
            formattedAddress: result.formatted_address || ""
          });

          const geometryLocation =
            result.geometry?.location ?? new window.google.maps.LatLng(lat, lng);

          void resolveAndApplyLocation(locationData, geometryLocation);
        });
      },
      () => {},
      {
        enableHighAccuracy: false,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 0
      }
    );
  }, [
    autoFillFromGeolocation,
    inputValue,
    isScriptLoaded,
    resolveAndApplyLocation,
    value
  ]);

  const handleSelectSuggestion = React.useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      if (!placesService.current) {
        return;
      }

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
            const locationData = buildLocationDataFromPlace({
              addressComponents: place.address_components || [],
              placeId: place.place_id || "",
              formattedAddress: place.formatted_address || ""
            });

            void resolveAndApplyLocation(locationData, place.geometry?.location);
          }

          setIsLoading(false);
        }
      );
    },
    [placesService, resolveAndApplyLocation]
  );

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
          if (status !== window.google.maps.GeocoderStatus.OK || !results?.length) {
            return;
          }

          const result = results[0];
          const locationData = buildLocationDataFromPlace({
            addressComponents: result.address_components || [],
            placeId: result.place_id || "",
            formattedAddress: result.formatted_address || ""
          });

          void resolveAndApplyLocation(locationData, result.geometry?.location);
        }
      );
    },
    [resolveAndApplyLocation]
  );

  const handleClear = React.useCallback(() => {
    hasUserEditedRef.current = true;
    onChange(null);
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    setValidationError(null);
    inputRef.current?.focus();
  }, [onChange]);

  const handleInputChange = React.useCallback(
    (nextValue: string) => {
      if (value) {
        onChange(null);
      }

      hasUserEditedRef.current = true;
      setInputValue(nextValue);
      setShowSuggestions(true);

      if (validationError) {
        setValidationError(null);
      }
    },
    [onChange, validationError, value]
  );

  const handleFocus = React.useCallback(() => {
    if (!value) {
      setShowSuggestions(true);
    }
  }, [value]);

  const handleBlur = React.useCallback(() => {
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

      if (isPostalCodeInput(trimmed)) {
        resolvePostalEntry(trimmed.replace(/\s+/g, ""));
      }
    }, BLUR_DISMISS_DELAY_MS);
  }, [inputValue, resolvePostalEntry, value]);

  return {
    inputRef,
    inputValue,
    suggestions,
    isLoading,
    isScriptLoaded,
    validationError,
    displayValue: value ? formatLocationDisplay(value) : inputValue,
    shouldShowSuggestions: showSuggestions && suggestions.length > 0 && !value,
    showClear: Boolean(value) && !isLoading,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleClear,
    handleSelectSuggestion
  };
};
