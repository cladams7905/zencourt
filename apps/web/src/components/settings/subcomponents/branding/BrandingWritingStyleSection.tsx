"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../ui/card";
import { Label } from "../../../ui/label";
import { Button } from "../../../ui/button";
import { Textarea } from "../../../ui/textarea";
import { Slider } from "../../../ui/slider";

interface BrandingWritingStyleSectionProps {
  toneMeta: { label: string; description: string; example: string };
  toneValue: number;
  setWritingToneLevel: (value: number) => void;
  writingStyleCustom: string;
  setWritingStyleCustom: (value: string) => void;
  WRITING_STYLE_MAX_CHARS: number;
  isWritingStyleDirty: boolean;
  isLoadingStyle: boolean;
  handleSaveWritingStyle: () => Promise<void>;
  writingStyleSentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function BrandingWritingStyleSection({
  toneMeta,
  toneValue,
  setWritingToneLevel,
  writingStyleCustom,
  setWritingStyleCustom,
  WRITING_STYLE_MAX_CHARS,
  isWritingStyleDirty,
  isLoadingStyle,
  handleSaveWritingStyle,
  writingStyleSentinelRef
}: BrandingWritingStyleSectionProps) {
  return (
    <>
      <Card id="writing-style">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Writing Style</CardTitle>
          </div>
          <CardDescription>
            Define how AI should write content in your voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Writing Tone</Label>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">{toneMeta.label}</span>
                <span className="text-muted-foreground">{toneValue}/5</span>
              </div>
              <div className="mt-3">
                <Slider
                  value={[toneValue]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={([value]) => setWritingToneLevel(value)}
                  className="w-full"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Informal</span>
                <span>Formal</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {toneMeta.description}
              </p>
              <div className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground italic">
                &quot;{toneMeta.example}&quot;
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customDescription">
              Additional Style Notes (Optional)
            </Label>
            <Textarea
              id="customDescription"
              value={writingStyleCustom}
              onChange={(e) => setWritingStyleCustom(e.target.value)}
              placeholder="e.g., I often use phrases like 'y'all' and 'howdy'."
              rows={3}
              maxLength={WRITING_STYLE_MAX_CHARS}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {writingStyleCustom.length}/{WRITING_STYLE_MAX_CHARS}
            </div>
          </div>

          {isWritingStyleDirty && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveWritingStyle} disabled={isLoadingStyle}>
                {isLoadingStyle ? "Saving..." : "Save Writing Style"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div id="media" ref={writingStyleSentinelRef} className="h-px" />
    </>
  );
}
