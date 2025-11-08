"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import { ScrollArea } from "../../ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "../../ui/collapsible";
import {
  ChevronRight,
  ChevronDown,
  Monitor,
  Smartphone,
  MapPin,
  FileText,
  Type,
  Sparkles
} from "lucide-react";
import Image from "next/image";
import type { ProcessedImage } from "../../../types/images";
import type { CategorizedGroup } from "../../../types/roomCategory";

export interface VideoSettings {
  orientation: "landscape" | "vertical";
  roomOrder: Array<{ id: string; name: string; imageCount: number }>;
  logoFile: File | null;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  scriptText: string;
  enableSubtitles: boolean;
  subtitleFont: string;
  aiDirections: string;
}

interface ReviewStageProps {
  images: ProcessedImage[];
  categorizedGroups: CategorizedGroup[];
  videoSettings?: VideoSettings;
  onConfirm: () => void;
  onBack: () => void;
  isConfirming?: boolean;
}

export function ReviewStage({
  images,
  categorizedGroups,
  videoSettings,
  onConfirm,
  onBack,
  isConfirming = false
}: ReviewStageProps) {
  const [isImagesOpen, setIsImagesOpen] = useState(false);

  const totalImages = images.filter(
    (img) => img.status === "uploaded" || img.status === "analyzed"
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-6">
          {/* Video Settings Section */}
          {videoSettings && (
            <section>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Video Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Review your video settings before generating
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Orientation Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      {videoSettings.orientation === "landscape" ? (
                        <Monitor className="h-4 w-4" />
                      ) : (
                        <Smartphone className="h-4 w-4" />
                      )}
                      Orientation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm capitalize">
                      {videoSettings.orientation}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {videoSettings.orientation === "landscape"
                        ? "16:9"
                        : "9:16"}{" "}
                      aspect ratio
                    </p>
                  </CardContent>
                </Card>

                {/* Room Order Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Walkthrough Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {videoSettings.roomOrder.length} rooms
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {videoSettings.roomOrder.map((r) => r.name).join(" → ")}
                    </p>
                  </CardContent>
                </Card>

                {/* Logo Card */}
                {videoSettings.logoFile && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Logo Overlay
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded border bg-muted">
                          <Image
                            src={URL.createObjectURL(videoSettings.logoFile)}
                            alt="Logo"
                            fill
                            className="object-contain p-1"
                          />
                        </div>
                        <div>
                          <p className="text-sm">
                            {videoSettings.logoFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {videoSettings.logoPosition.replace("-", " ")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Subtitles Card */}
                {videoSettings.enableSubtitles && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Subtitles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">Enabled</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        Font: {videoSettings.subtitleFont.replace("-", " ")}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Script Card */}
                {videoSettings.scriptText && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Script
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-3 whitespace-pre-wrap">
                        {videoSettings.scriptText}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* AI Directions Card */}
                {videoSettings.aiDirections && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Directions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-3 whitespace-pre-wrap">
                        {videoSettings.aiDirections}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          )}

          {/* Input Images Section - Collapsible */}
          <section>
            <Collapsible open={isImagesOpen} onOpenChange={setIsImagesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Input Images</h3>
                  <p className="text-sm text-muted-foreground">
                    {totalImages} {totalImages === 1 ? "image" : "images"}{" "}
                    organized into {categorizedGroups.length}{" "}
                    {categorizedGroups.length === 1 ? "category" : "categories"}
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    isImagesOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {/* Categorized Groups */}
                <div className="space-y-4">
                  {categorizedGroups.map((group, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-muted/30"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.metadata.color }}
                        />
                        <h4 className="font-semibold text-sm">
                          {group.displayLabel}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          ({group.images.length}{" "}
                          {group.images.length === 1 ? "image" : "images"})
                        </span>
                      </div>

                      {/* Image Grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {group.images.slice(0, 12).map((image) => (
                          <div
                            key={image.id}
                            className="relative aspect-square rounded-md overflow-hidden bg-muted border"
                          >
                            <Image
                              src={image.previewUrl}
                              alt={image.file.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 25vw, (max-width: 768px) 16vw, 12vw"
                            />
                          </div>
                        ))}
                        {group.images.length > 12 && (
                          <div className="aspect-square rounded-md border bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground font-medium">
                              +{group.images.length - 12}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 left-0 right-0 z-20 bg-white border-t flex flex-col">
        {/* Estimated Generation Time Block */}
        <div className="px-6 py-4 bg-primary/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Estimated Generation Time:
            </span>
            <span className="text-lg font-semibold text-primary">
              ~2 minutes
            </span>
          </div>
        </div>

        {/* Footer with navigation buttons */}
        <div className="px-6 py-4 border-t bg-white flex gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Back to Plan
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1"
            size="lg"
          >
            {isConfirming ? (
              <>Confirming...</>
            ) : (
              <>
                Confirm & Generate
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
