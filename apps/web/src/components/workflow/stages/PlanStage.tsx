"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Switch } from "../../ui/switch";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "../../ui/drawer";
import {
  GripVertical,
  Upload,
  Sparkles,
  X,
  Monitor,
  Smartphone,
  Eye
} from "lucide-react";
import Image from "next/image";
import { CategorizedGroup, RoomCategory } from "@web/src/types/vision";
import type { LogoPosition } from "@shared/types/video";

export interface VideoSettings {
  orientation: "landscape" | "vertical";
  roomOrder: RoomOrder[];
  logoFile: File | null;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  scriptText: string;
  enableSubtitles: boolean;
  subtitleFont: string;
  aiDirections: string;
}

interface PlanStageProps {
  availableCategories: string[];
  categorizedGroups?: CategorizedGroup[];
  onContinue: (settings: VideoSettings) => void;
  onBack: () => void;
}

type VideoOrientation = "landscape" | "vertical";
type SubtitleFont =
  | "arial"
  | "helvetica"
  | "times-new-roman"
  | "georgia"
  | "courier"
  | "verdana";

interface RoomOrder {
  id: string;
  name: string;
  category: RoomCategory | string;
  roomNumber?: number;
  imageCount: number;
}

/**
 * Preview Content Component - Reusable for desktop and mobile
 */
function PreviewContent({
  orientation,
  logoFile,
  logoPosition,
  enableSubtitles,
  scriptText,
  subtitleFont,
  roomOrder
}: {
  orientation: VideoOrientation;
  logoFile: File | null;
  logoPosition: LogoPosition;
  enableSubtitles: boolean;
  scriptText: string;
  subtitleFont: SubtitleFont;
  roomOrder: RoomOrder[];
}) {
  return (
    <>
      <h3 className="text-lg font-semibold mb-2">Preview</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Demo video showing the style of output
      </p>

      {/* Video Preview Container */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <div
          className={`relative ${
            orientation === "landscape"
              ? "w-full aspect-video"
              : "w-48 aspect-9/16 mx-auto"
          }`}
        >
          {/* Placeholder for demo video */}
          <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-gray-800 to-gray-900">
            <div className="text-center text-white">
              <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-75">Demo Video Preview</p>
            </div>
          </div>

          {/* Logo Overlay Preview */}
          {logoFile && (
            <div
              className={`absolute w-16 h-16 p-2 ${
                logoPosition === "top-left"
                  ? "top-4 left-4"
                  : logoPosition === "top-right"
                  ? "top-4 right-4"
                  : logoPosition === "bottom-left"
                  ? "bottom-4 left-4"
                  : "bottom-4 right-4"
              }`}
            >
              <div className="relative w-full h-full bg-white/90 rounded p-1">
                <Image
                  src={URL.createObjectURL(logoFile)}
                  alt="Logo overlay"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* Subtitle Preview */}
          {enableSubtitles && scriptText && (
            <div className="absolute bottom-20 left-4 right-4">
              <p
                className="text-white text-center text-sm bg-black/75 px-3 py-2 rounded"
                style={{ fontFamily: subtitleFont.replace("-", " ") }}
              >
                {scriptText.split(" ").slice(0, 8).join(" ")}...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="mt-6 space-y-3">
        <div className="text-sm">
          <span className="font-medium">Orientation:</span>{" "}
          <span className="text-muted-foreground capitalize">
            {orientation}
          </span>
        </div>
        <div className="text-sm">
          <span className="font-medium">Rooms:</span>{" "}
          <span className="text-muted-foreground">
            {roomOrder.length} rooms
          </span>
        </div>
        {logoFile && (
          <div className="text-sm">
            <span className="font-medium">Logo:</span>{" "}
            <span className="text-muted-foreground capitalize">
              {logoPosition.replace("-", " ")}
            </span>
          </div>
        )}
        {enableSubtitles && (
          <div className="text-sm">
            <span className="font-medium">Subtitles:</span>{" "}
            <span className="text-muted-foreground capitalize">
              Enabled ({subtitleFont.replace("-", " ")})
            </span>
          </div>
        )}
      </div>
    </>
  );
}

export function PlanStage({
  categorizedGroups = [],
  onContinue,
  onBack
}: PlanStageProps) {
  // Video configuration state
  const [orientation, setOrientation] = useState<VideoOrientation>("vertical");
  const [roomOrder, setRoomOrder] = useState<RoomOrder[]>(() => {
    // Track room counts to handle duplicates (bedroom-1, bedroom-2, etc)
    const roomCounts: Record<string, number> = {};

    return categorizedGroups.map((group, index) => {
      const category = group.category || `room-${index}`;
      const baseName =
        group.displayLabel ||
        group.metadata?.label ||
        category ||
        `Room ${index + 1}`;

      // Track how many times we've seen this room type
      if (!roomCounts[category]) {
        roomCounts[category] = 0;
      }
      roomCounts[category]++;

      // Generate unique ID with suffix if there are duplicates
      const count = roomCounts[category];
      const uniqueId = count > 1 ? `${category}-${count}` : category;
      const displayName = count > 1 ? `${baseName} ${count}` : baseName;
      const roomNumber =
        group.metadata?.allowNumbering && count > 0 ? count : undefined;

      return {
        id: uniqueId,
        name: displayName,
        category,
        roomNumber,
        imageCount: group.images?.length || 0
      };
    });
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("top-right");
  const [scriptText, setScriptText] = useState("");
  const [enableSubtitles, setEnableSubtitles] = useState(false);
  const [subtitleFont, setSubtitleFont] = useState<SubtitleFont>("arial");
  const [aiDirections, setAiDirections] = useState("");

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
    }
  };

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...roomOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setRoomOrder(newOrder);
    setDraggedIndex(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Generate AI script
  const handleGenerateScript = async () => {
    // TODO: Implement AI script generation
    setScriptText("AI-generated script will appear here...");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Main Content Area */}
      <div className="flex flex-1s">
        {/* Left side - Configuration (2/3 width) */}
        <div className="flex-2 min-w-0">
          <div className="p-6 space-y-6">
            {/* Orientation Toggle */}
            <Card>
              <CardHeader>
                <CardTitle>Video Orientation</CardTitle>
                <CardDescription>
                  Choose between landscape or vertical video format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={orientation}
                  onValueChange={(value) =>
                    setOrientation(value as VideoOrientation)
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem
                      value="landscape"
                      id="landscape"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="landscape"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Monitor className="mb-3 h-6 w-6" />
                      <span className="text-sm font-medium">Landscape</span>
                      <span className="text-xs text-muted-foreground">
                        16:9
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="vertical"
                      id="vertical"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="vertical"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Smartphone className="mb-3 h-6 w-6" />
                      <span className="text-sm font-medium">Vertical</span>
                      <span className="text-xs text-muted-foreground">
                        9:16
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Room Order */}
            <Card>
              <CardHeader>
                <CardTitle>Walkthrough Order</CardTitle>
                <CardDescription>
                  Drag to reorder the rooms in your video walkthrough
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roomOrder.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No rooms categorized yet
                    </p>
                  ) : (
                    roomOrder.map((room, index) => (
                      <div
                        key={room.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-move hover:bg-gray-50 transition-colors"
                      >
                        <GripVertical className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{room.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {room.imageCount}{" "}
                            {room.imageCount === 1 ? "image" : "images"}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          #{index + 1}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Logo Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Logo Overlay</CardTitle>
                <CardDescription>
                  Upload a logo and choose where to place it on the video
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo Upload */}
                <div>
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors">
                      {logoFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative w-20 h-20">
                            <Image
                              src={URL.createObjectURL(logoFile)}
                              alt="Logo preview"
                              fill
                              className="object-contain"
                            />
                          </div>
                          <p className="text-sm font-medium">{logoFile.name}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              setLogoFile(null);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-muted-foreground">
                            Click to upload logo
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </Label>
                </div>

                {/* Logo Position */}
                {logoFile && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Logo Position
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          "top-left",
                          "top-right",
                          "bottom-left",
                          "bottom-right"
                        ] as LogoPosition[]
                      ).map((position) => (
                        <Button
                          key={position}
                          variant={
                            logoPosition === position ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setLogoPosition(position)}
                          className="justify-start"
                        >
                          {position
                            .split("-")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Script & Subtitles */}
            <Card>
              <CardHeader>
                <CardTitle>Script & Subtitles</CardTitle>
                <CardDescription>
                  Add a voiceover script and enable subtitles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Script Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="script">Script</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateScript}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate with AI
                    </Button>
                  </div>
                  <Textarea
                    id="script"
                    placeholder="Enter your video script or generate one with AI..."
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </div>

                {/* Subtitle Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="subtitles">Enable Subtitles</Label>
                    <p className="text-sm text-muted-foreground">
                      Display script as subtitles on the video
                    </p>
                  </div>
                  <Switch
                    id="subtitles"
                    checked={enableSubtitles}
                    onCheckedChange={setEnableSubtitles}
                  />
                </div>

                {/* Subtitle Font */}
                {enableSubtitles && (
                  <div>
                    <Label htmlFor="subtitle-font" className="mb-2 block">
                      Subtitle Font
                    </Label>
                    <Select
                      value={subtitleFont}
                      onValueChange={(value) =>
                        setSubtitleFont(value as SubtitleFont)
                      }
                    >
                      <SelectTrigger id="subtitle-font">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arial">Arial</SelectItem>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="times-new-roman">
                          Times New Roman
                        </SelectItem>
                        <SelectItem value="georgia">Georgia</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                        <SelectItem value="verdana">Verdana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Directions */}
            <Card>
              <CardHeader>
                <CardTitle>Additional AI Directions</CardTitle>
                <CardDescription>
                  Provide any additional instructions for the AI video generator
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="E.g., 'Focus on natural lighting', 'Use smooth transitions', 'Emphasize the outdoor spaces'..."
                  value={aiDirections}
                  onChange={(e) => setAiDirections(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right side - Demo Video Preview (Desktop only, 1/3 width) - Sticky */}
        <div className="hidden lg:block flex-1 bg-gray-50 border-l">
          <div className="p-6 sticky top-0 bg-gray-50">
            <PreviewContent
              orientation={orientation}
              logoFile={logoFile}
              logoPosition={logoPosition}
              enableSubtitles={enableSubtitles}
              scriptText={scriptText}
              subtitleFont={subtitleFont}
              roomOrder={roomOrder}
            />
          </div>
        </div>
      </div>

      {/* Footer Navigation - Full Width */}
      <div className="sticky bottom-0 left-0 right-0 z-20 pt-4 pb-4 px-6 bg-white border-t">
        {/* Mobile Preview Drawer Button */}
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              className="w-full mb-3 lg:hidden"
              size="lg"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Video
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Video Preview</DrawerTitle>
              <DrawerDescription>
                See how your configured video will look
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto max-h-[70vh]">
              <PreviewContent
                orientation={orientation}
                logoFile={logoFile}
                logoPosition={logoPosition}
                enableSubtitles={enableSubtitles}
                scriptText={scriptText}
                subtitleFont={subtitleFont}
                roomOrder={roomOrder}
              />
            </div>
            <div className="p-4 border-t">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Back to Categorize
          </Button>
          <Button
            onClick={() => {
              const settings: VideoSettings = {
                orientation,
                roomOrder,
                logoFile,
                logoPosition,
                scriptText,
                enableSubtitles,
                subtitleFont,
                aiDirections
              };
              onContinue(settings);
            }}
            className="flex-1"
            size="lg"
          >
            Continue to Review
          </Button>
        </div>
      </div>
    </div>
  );
}
