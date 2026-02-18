import * as React from "react";
import { Loader2, X } from "lucide-react";
import { Input } from "@web/src/components/ui/input";
import { Button } from "@web/src/components/ui/button";

interface LocationInputFieldProps {
  value: string;
  placeholder: string;
  disabled: boolean;
  isLoading: boolean;
  showClear: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onClear: () => void;
}

export const LocationInputField = React.forwardRef<
  HTMLInputElement,
  LocationInputFieldProps
>(
  (
    {
      value,
      placeholder,
      disabled,
      isLoading,
      showClear,
      onChange,
      onFocus,
      onBlur,
      onClear
    },
    ref
  ) => {
    return (
      <>
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className="pr-8"
          disabled={disabled}
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {showClear && !isLoading && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-secondary/20"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </>
    );
  }
);

LocationInputField.displayName = "LocationInputField";
