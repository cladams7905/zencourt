"use client";

import { useRef, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";

interface DragDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploadInitiated: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFormats?: string[];
  isDisabled?: boolean;
}

export function DragDropZone({
  onFilesSelected,
  isUploadInitiated,
  maxFiles = 50,
  maxFileSize = 10 * 1024 * 1024, // 10MB in bytes
  acceptedFormats = [".jpg", ".jpeg", ".png", ".webp"],
  isDisabled = false
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!isDisabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      validateAndProcessFiles(fileArray);
    }
    // Reset input value to allow selecting the same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateAndProcessFiles = (files: File[]) => {
    setError(null);

    // Check file count
    if (files.length > maxFiles) {
      setError(
        `Maximum ${maxFiles} files allowed. You selected ${files.length} files.`
      );
      return;
    }

    // Filter and validate files
    const validFiles: File[] = [];
    const invalidTypeFiles: string[] = [];
    const oversizedFiles: string[] = [];

    files.forEach((file) => {
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const isValidFormat = acceptedFormats.includes(fileExtension);
      const isValidSize = file.size <= maxFileSize;

      if (!isValidFormat) {
        invalidTypeFiles.push(file.name);
      } else if (!isValidSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        oversizedFiles.push(`${file.name} (${fileSizeMB}MB)`);
      } else {
        validFiles.push(file);
      }
    });

    // Build error message
    const errorMessages: string[] = [];

    if (invalidTypeFiles.length > 0) {
      errorMessages.push(
        `Invalid file type(s): ${invalidTypeFiles.join(
          ", "
        )}. Only ${acceptedFormats.join(", ")} files are allowed.`
      );
    }

    if (oversizedFiles.length > 0) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(0);
      errorMessages.push(
        `File(s) too large: ${oversizedFiles.join(
          ", "
        )}. Maximum size is ${maxSizeMB}MB per file.`
      );
    }

    // Show error if there are invalid files
    if (errorMessages.length > 0) {
      setError(errorMessages.join(" "));
    }

    // Process valid files only if there are any
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    } else if (errorMessages.length === 0) {
      setError("No valid files selected.");
    }
  };

  // Drag and drop event handlers
  const handleDragEnter = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDisabled) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (isDisabled) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      validateAndProcessFiles(fileArray);
    }
  };

  return (
    <div className={`w-full ${isUploadInitiated ? `h-[200px]` : `h-[500px]`}`}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFormats.join(",")}
        onChange={handleFileChange}
        className="hidden"
        disabled={isDisabled}
      />

      <button
        type="button"
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isDisabled}
        className={`
          w-full h-full rounded-lg border-2 border-dashed
          flex flex-col items-center justify-center gap-4 p-8
          transition-all duration-200
          ${
            isDisabled
              ? "bg-muted/20 border-muted cursor-not-allowed opacity-50"
              : isDragging
              ? "border-black bg-black/5 scale-[0.98]"
              : "border-border bg-muted/10 hover:border-black/40 hover:bg-muted/20 cursor-pointer"
          }
        `}
      >
        <div
          className={`w-16 h-16 aspect-square rounded-full flex items-center justify-center
            transition-colors duration-200
            ${
              isDragging
                ? "bg-black text-white"
                : "bg-linear-to-br from-[#e8ddd3] to-[#d4c4b0]"
            }
          `}
        >
          {isDragging ? (
            <ImageIcon size={32} className="text-white" />
          ) : (
            <Upload size={32} className="text-black/70" />
          )}
        </div>

        <div className="text-center">
          <p className="text-base font-medium mb-2">
            {isDragging
              ? "Drop your images here"
              : "Click to upload or drag and drop"}
          </p>
          <p className="text-sm text-muted-foreground">
            {acceptedFormats
              .map((ext) => ext.toUpperCase().replace(".", ""))
              .join(", ")}{" "}
            files up to 10MB each
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Maximum {maxFiles} images
          </p>
        </div>
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
