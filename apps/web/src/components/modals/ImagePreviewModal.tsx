/**
 * ImagePreviewModal Component
 *
 * Full-screen lightbox for previewing images with navigation,
 * keyboard shortcuts, and detailed information display.
 */

"use client";

import { useEffect, useCallback, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download
} from "lucide-react";
import type { ProcessedImage } from "../../types/images";
import Image from "next/image";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ImagePreviewModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Current image to display */
  currentImage: ProcessedImage;
  /** All images for navigation */
  allImages: ProcessedImage[];
  /** Current image index in allImages array */
  currentIndex: number;
  /** Callback when navigating to different image */
  onNavigate?: (index: number) => void;
  /** Category information for current image */
  categoryInfo?: {
    displayLabel: string;
    color: string;
  };
  /** Show image metadata */
  showMetadata?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function ImagePreviewModal({
  isOpen,
  onClose,
  currentImage,
  allImages,
  currentIndex,
  onNavigate,
  categoryInfo,
  showMetadata = true
}: ImagePreviewModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Navigate to previous image (with looping)
  const handlePrevious = useCallback(() => {
    if (onNavigate) {
      setImageLoaded(false);
      setIsZoomed(false);
      // Loop to last image if at the beginning
      const newIndex =
        currentIndex > 0 ? currentIndex - 1 : allImages.length - 1;
      onNavigate(newIndex);
    }
  }, [currentIndex, allImages.length, onNavigate]);

  // Navigate to next image (with looping)
  const handleNext = useCallback(() => {
    if (onNavigate) {
      setImageLoaded(false);
      setIsZoomed(false);
      // Loop to first image if at the end
      const newIndex =
        currentIndex < allImages.length - 1 ? currentIndex + 1 : 0;
      onNavigate(newIndex);
    }
  }, [currentIndex, allImages.length, onNavigate]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "z":
        case "Z":
          setIsZoomed((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrevious, handleNext]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset zoom when image changes
  useEffect(() => {
    setIsZoomed(false);
    setImageLoaded(false);
  }, [currentImage.id]);

  // Download image
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentImage.url || currentImage.previewUrl;
    link.download = currentImage.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60! bg-black bg-opacity-95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white hover:text-black hover:bg-opacity/10 rounded-full transition-colors z-10"
        aria-label="Close preview"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation Buttons */}
      {allImages.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white hover:text-black hover:bg-opacity/10 rounded-full transition-colors z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white hover:text-black hover:bg-opacity/10 rounded-full transition-colors z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Image Counter */}
      <div className="absolute top-4 left-4 px-3 py-1 bg-black bg-opacity-75 text-white text-sm rounded z-10">
        {currentIndex + 1} / {allImages.length}
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black bg-opacity-75 rounded-lg p-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
          className="p-2 text-white hover:bg-white hover:bg-opacity/10 hover:text-black rounded transition-colors"
          aria-label={isZoomed ? "Zoom out" : "Zoom in"}
        >
          {isZoomed ? (
            <ZoomOut className="w-5 h-5" />
          ) : (
            <ZoomIn className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="p-2 text-white hover:bg-white hover:text-black hover:bg-opacity/10 rounded transition-colors"
          aria-label="Download image"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div
        className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading State */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Image */}
        <Image
          src={currentImage.url || currentImage.previewUrl}
          alt={currentImage.file.name}
          width={1920}
          height={1080}
          unoptimized
          className={`max-w-full max-h-full object-contain transition-all duration-300 ${
            isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
          } ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsZoomed(!isZoomed)}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Image Info Panel */}
      {showMetadata && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-90 text-white p-4 z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  {currentImage.file.name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4  gap-3 text-sm">
                  {/* Category */}
                  {categoryInfo && (
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: categoryInfo.color }}
                        />
                        <span>{categoryInfo.displayLabel}</span>
                      </div>
                    </div>
                  )}

                  {/* Classification */}
                  {currentImage.confidence && (
                    <div>
                      <span className="text-gray-400">AI Confidence:</span>
                      <div className="mt-1">
                        {(currentImage.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}

                  {/* File Size */}
                  {currentImage.file.size && (
                    <div>
                      <span className="text-gray-400">Size:</span>
                      <div className="mt-1">
                        {(currentImage.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  )}

                  {/* File name */}
                  <div>
                    <span className="text-gray-400">Filename:</span>
                    <div className="mt-1 truncate">
                      {currentImage.file.name}
                    </div>
                  </div>
                </div>

                {/* Features */}
                {currentImage?.features && currentImage.features.length > 0 && (
                  <div className="mt-3">
                    <span className="text-gray-400 text-sm">
                      Detected Features:
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentImage.features.map(
                        (feature: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-white text-black bg-opacity/10 rounded text-xs"
                          >
                            {feature}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Keyboard Shortcuts */}
              <div className="hidden lg:block text-xs text-gray-400">
                <div className="mb-2">
                  <kbd className="px-2 py-1 bg-white bg-opacity/10 rounded">
                    ESC
                  </kbd>{" "}
                  Close
                </div>
                <div className="mb-2">
                  <kbd className="px-2 py-1 bg-white bg-opacity/10 rounded">
                    ←
                  </kbd>
                  <kbd className="px-2 py-1 bg-white bg-opacity/10 rounded ml-1">
                    →
                  </kbd>{" "}
                  Navigate
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-white bg-opacity/10 rounded">
                    Z
                  </kbd>{" "}
                  Zoom
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Hook for Managing Preview State
// ============================================================================

/**
 * Custom hook to manage image preview modal state
 */
export function useImagePreview(allImages: ProcessedImage[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openPreview = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const closePreview = () => {
    setIsOpen(false);
  };

  const navigateToIndex = (index: number) => {
    if (index >= 0 && index < allImages.length) {
      setCurrentIndex(index);
    }
  };

  const currentImage = allImages[currentIndex];

  return {
    isOpen,
    currentIndex,
    currentImage,
    openPreview,
    closePreview,
    navigateToIndex
  };
}

// ============================================================================
// Export Default
// ============================================================================

export default ImagePreviewModal;
