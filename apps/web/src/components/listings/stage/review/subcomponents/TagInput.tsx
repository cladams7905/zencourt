import * as React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@web/src/components/ui/button";
import { Input } from "@web/src/components/ui/input";

export type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  onSave?: () => void;
  addLabel?: string;
  singleValue?: boolean;
};

export const TagInput = ({
  value,
  onChange,
  placeholder,
  onSave,
  addLabel = "Add feature",
  singleValue = false
}: TagInputProps) => {
  const [inputValue, setInputValue] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);

  const addTag = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const exists = value.some(
        (tag) => tag.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        setInputValue("");
        setIsEditing(false);
        return;
      }
      const next = singleValue ? [trimmed] : [...value, trimmed];
      onChange(next);
      setInputValue("");
      setIsEditing(false);
      onSave?.();
    },
    [onChange, onSave, singleValue, value]
  );

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
    onSave?.();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-xs text-foreground"
        >
          {tag}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(inputValue);
              }
              if (event.key === "Escape") {
                setIsEditing(false);
                setInputValue("");
              }
            }}
            onBlur={() => addTag(inputValue)}
            placeholder={placeholder}
            className="h-7 w-40"
            autoFocus
          />
          <Button
            variant="outline"
            onClick={() => addTag(inputValue)}
            className="rounded-full h-7 w-7"
            aria-label="Confirm"
          >
            <Check />
          </Button>
          <Button
            variant="outline"
            className="rounded-full h-7 w-7"
            onClick={() => {
              setIsEditing(false);
              setInputValue("");
            }}
            aria-label="Cancel"
          >
            <X />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-transparent px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsEditing(true)}
        >
          {addLabel}
        </button>
      )}
    </div>
  );
};
