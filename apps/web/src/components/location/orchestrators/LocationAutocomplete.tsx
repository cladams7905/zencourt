"use client";

import { cn } from "@web/src/components/ui/utils";
import { LocationInputField, SuggestionsDropdown } from "@web/src/components/location/components";
import { useLocationAutocomplete } from "@web/src/components/location/domain/hooks";
import type { LocationData } from "@web/src/components/location/shared/types";

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
  const {
    inputRef,
    displayValue,
    suggestions,
    isLoading,
    isScriptLoaded,
    validationError,
    shouldShowSuggestions,
    showClear,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleClear,
    handleSelectSuggestion
  } = useLocationAutocomplete({
    value,
    onChange,
    apiKey,
    initialValue,
    autoFillFromGeolocation
  });

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <LocationInputField
          ref={inputRef}
          value={displayValue}
          placeholder={placeholder}
          disabled={!isScriptLoaded}
          isLoading={isLoading}
          showClear={showClear}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClear={handleClear}
        />

        {shouldShowSuggestions && (
          <SuggestionsDropdown
            suggestions={suggestions}
            onSelect={handleSelectSuggestion}
          />
        )}
      </div>
      {validationError && (
        <p className="mt-2 text-xs text-destructive">{validationError}</p>
      )}
    </div>
  );
};
