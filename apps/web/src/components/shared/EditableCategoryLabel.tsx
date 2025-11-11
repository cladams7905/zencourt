/**
 * EditableCategoryLabel Component
 *
 * Allows users to rename category labels with validation
 * and a dropdown to select from predefined categories.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Check, X, Edit2, ChevronDown } from "lucide-react";
import { ROOM_CATEGORIES, RoomCategory } from "@web/src/types/vision";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface EditableCategoryLabelProps {
  /** Current category display label */
  currentLabel: string;
  /** Current category ID */
  categoryId: RoomCategory;
  /** Callback when category is renamed */
  onRename: (newLabel: string, newCategoryId?: RoomCategory) => void;
  /** Whether the label is currently editable */
  editable?: boolean;
  /** Show category selector dropdown */
  showCategorySelector?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function EditableCategoryLabel({
  currentLabel,
  categoryId,
  onRename,
  editable = true,
  showCategorySelector = true,
  className = ""
}: EditableCategoryLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentLabel);
  const [showDropdown, setShowDropdown] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  // Validate the new label
  const validateLabel = (label: string): ValidationResult => {
    const trimmed = label.trim();

    if (!trimmed) {
      return { isValid: false, error: "Label cannot be empty" };
    }

    if (trimmed.length < 2) {
      return { isValid: false, error: "Label must be at least 2 characters" };
    }

    if (trimmed.length > 50) {
      return { isValid: false, error: "Label must be less than 50 characters" };
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-\/]+$/.test(trimmed)) {
      return {
        isValid: false,
        error: "Only letters, numbers, spaces, hyphens, and slashes allowed"
      };
    }

    return { isValid: true };
  };

  // Handle saving the edit
  const handleSave = () => {
    const validation = validateLabel(editValue);

    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid label");
      return;
    }

    const trimmed = editValue.trim();
    if (trimmed !== currentLabel) {
      onRename(trimmed);
    }

    setIsEditing(false);
    setValidationError(null);
  };

  // Handle canceling the edit
  const handleCancel = () => {
    setEditValue(currentLabel);
    setIsEditing(false);
    setValidationError(null);
  };

  // Handle selecting a category from dropdown
  const handleSelectCategory = (newCategoryId: RoomCategory) => {
    const category = ROOM_CATEGORIES[newCategoryId];
    onRename(category.label, newCategoryId);
    setEditValue(category.label);
    setShowDropdown(false);
  };

  // Handle key press in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Get all available categories sorted by group
  const categoriesByGroup = Object.values(ROOM_CATEGORIES)
    .sort((a, b) => a.order - b.order)
    .reduce((acc, category) => {
      if (!acc[category.group]) {
        acc[category.group] = [];
      }
      acc[category.group].push(category);
      return acc;
    }, {} as Record<string, (typeof ROOM_CATEGORIES)[RoomCategory][]>);

  // Editing mode
  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            setValidationError(null);
          }}
          onKeyDown={handleKeyDown}
          className={`px-2 py-1 border rounded text-sm ${
            validationError ? "border-red-500" : "border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="Enter category name"
        />

        <button
          onClick={handleSave}
          className="p-1 text-green-600 hover:bg-green-50 rounded"
          title="Save"
        >
          <Check className="w-4 h-4" />
        </button>

        <button
          onClick={handleCancel}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {validationError && (
          <span className="text-xs text-red-600">{validationError}</span>
        )}
      </div>
    );
  }

  // Display mode
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-semibold text-lg">{currentLabel}</span>

      {editable && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Edit label"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {showCategorySelector && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Change category"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {showDropdown && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-semibold text-gray-500 mb-2 px-2">
                      Change to:
                    </div>

                    {Object.entries(categoriesByGroup).map(
                      ([groupName, categories]) => (
                        <div key={groupName} className="mb-3">
                          <div className="text-xs font-medium text-gray-400 uppercase mb-1 px-2">
                            {groupName}
                          </div>
                          <div className="space-y-0.5">
                            {categories.map((category) => (
                              <button
                                key={category.id}
                                onClick={() =>
                                  handleSelectCategory(category.id)
                                }
                                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${
                                  category.id === categoryId
                                    ? "bg-blue-50 text-blue-700"
                                    : ""
                                }`}
                                disabled={category.id === categoryId}
                              >
                                <div
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="text-left">
                                  {category.label}
                                </span>
                                {category.id === categoryId && (
                                  <Check className="w-3 h-3 ml-auto" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Version for Headers
// ============================================================================

export function CompactEditableCategoryLabel({
  currentLabel,
  categoryId,
  onRename
}: Omit<
  EditableCategoryLabelProps,
  "editable" | "showCategorySelector" | "className"
>) {
  return (
    <EditableCategoryLabel
      currentLabel={currentLabel}
      categoryId={categoryId}
      onRename={onRename}
      editable={true}
      showCategorySelector={true}
      className="flex-1"
    />
  );
}

// ============================================================================
// Export Default
// ============================================================================

export default EditableCategoryLabel;
