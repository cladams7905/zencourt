"use client";

import { cn } from "@web/src/components/ui/utils";
import { LocationInputField, SuggestionsDropdown } from "@web/src/components/location/components";
import { useAddressAutocomplete } from "@web/src/components/location/domain/hooks";
import type { AddressSelection } from "@web/src/components/location/shared/types";

interface AddressAutocompleteProps {
  value: string;
  onChange: (nextValue: string) => void;
  apiKey: string;
  placeholder?: string;
  className?: string;
  country?: string;
  onSelectAddress?: (selection: AddressSelection) => void;
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
  const {
    inputValue,
    suggestions,
    isLoading,
    isScriptLoaded,
    showClear,
    shouldShowSuggestions,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleClear,
    handleSelectSuggestion
  } = useAddressAutocomplete({
    value,
    onChange,
    apiKey,
    country,
    onSelectAddress
  });

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <LocationInputField
          value={inputValue}
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
    </div>
  );
};
