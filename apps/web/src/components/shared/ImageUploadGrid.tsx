/**
 * ImageUploadGrid Component
 *
 * Displays images during the upload phase with status indicators,
 * retry functionality, and remove buttons. Used before AI categorization.
 */

"use client";

import { Loader2, X, AlertCircle, CheckCircle, RotateCw } from "lucide-react";
import type { ProcessedImage } from "../../types/images";
import Image from "next/image";

interface ImageUploadGridProps {
  images: ProcessedImage[];
  onRemove: (imageId: string) => void;
  onRetry?: (imageId: string) => void;
  onImageClick?: (imageId: string) => void;
}

export function ImageUploadGrid({
  images,
  onRemove,
  onRetry,
  onImageClick
}: ImageUploadGridProps) {
  if (images.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {images.length} {images.length === 1 ? "image" : "images"} selected
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
          >
            <div
              onClick={() => onImageClick?.(image.id)}
              className={`absolute inset-0 ${
                onImageClick ? "cursor-pointer" : ""
              }`}
            >
              <Image
                src={image.url || image.uploadUrl || image.previewUrl}
                alt={image.filename || image.file?.name || "Image"}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover"
              />
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" />

            {/* Remove X button (appears on hover in top-right) */}
            <button
              onClick={() => onRemove(image.id)}
              className="absolute top-2 right-2 z-20 p-1 bg-primary/50 hover:bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Upload Status Overlay */}
            {image.status === "uploading" && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <span className="text-xs text-white mt-2">Uploading...</span>
              </div>
            )}

            {image.status === "uploaded" && (
              <div className="absolute top-2 left-2 z-10 p-1 bg-black/50 rounded-full">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}

            {image.status === "error" && (
              <div className="absolute inset-0 bg-red-500/90 flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white mb-2" />
                <span className="text-xs text-white text-center px-2 mb-2">
                  {image.error || "Upload failed"}
                </span>
                {onRetry && (
                  <button
                    onClick={() => onRetry(image.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-white text-red-600 rounded text-xs hover:bg-gray-100 transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute bottom-2 left-2 right-2">
              <div className="text-xs font-medium text-white bg-black/60 rounded px-2 py-1 truncate">
                {image.filename || image.file?.name || "Image"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
