"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "../ui/utils";
import { Pencil, Loader2 } from "lucide-react";

interface ProjectNameInputProps {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  maxLength?: number;
  isSaving?: boolean;
}

export function ProjectNameInput({
  value,
  onChange,
  placeholder = "Untitled",
  maxLength = 100,
  isSaving = false
}: ProjectNameInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Only call onChange if value actually changed
    if (localValue.trim() !== value) {
      onChange(localValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setLocalValue(value); // Revert to original value
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setLocalValue(newValue);
    }
  };

  const displayValue = localValue || placeholder;
  const isEmpty = !localValue;

  return (
    <div className="flex items-center gap-2 px-6 pt-6 pb-2 pr-8">
      <div className="flex-1 relative group">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full text-2xl font-spartan font-semibold bg-transparent border-b-2 border-primary outline-none transition-colors",
              "placeholder:text-muted-foreground/50"
            )}
            placeholder={placeholder}
            maxLength={maxLength}
            aria-label="Project name"
          />
        ) : (
          <button
            onClick={handleClick}
            className={cn(
              "w-full text-left font-spartan text-2xl font-semibold transition-colors",
              "hover:text-primary focus:outline-none focus:text-primary",
              isEmpty && "text-muted-foreground/50"
            )}
            aria-label="Edit project name"
          >
            {displayValue}
          </button>
        )}

        {/* Edit icon - shown on hover when not editing */}
        {!isEditing && (
          <Pencil
            className={cn(
              "absolute left-44 -mt-[2px] top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
              "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            )}
          />
        )}
      </div>

      {/* Saving indicator */}
      {isSaving && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </div>
      )}

      {/* Character count */}
      {isEditing && (
        <span className="text-xs text-muted-foreground">
          {localValue.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
