import { MapPin } from "lucide-react";

interface SuggestionsDropdownProps {
  suggestions: google.maps.places.AutocompletePrediction[];
  onSelect: (suggestion: google.maps.places.AutocompletePrediction) => void;
}

export const SuggestionsDropdown = ({
  suggestions,
  onSelect
}: SuggestionsDropdownProps) => {
  return (
    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
      {suggestions.map((suggestion) => (
        <button
          type="button"
          key={suggestion.place_id}
          onClick={() => onSelect(suggestion)}
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
  );
};
