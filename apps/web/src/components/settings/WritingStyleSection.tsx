"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@web/src/components/ui/card";
import { Label } from "@web/src/components/ui/label";
import { Button } from "@web/src/components/ui/button";
import { Textarea } from "@web/src/components/ui/textarea";
import { Input } from "@web/src/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@web/src/components/ui/radio-group";
import { PenTool, X, Upload, Image as ImageIcon } from "lucide-react";
import { updateWritingStyle } from "@web/src/server/actions/db/userAdditional";
import { toast } from "sonner";

interface WritingStyleSectionProps {
  userId: string;
  initialData: {
    writingStylePreset: string | null;
    writingStyleCustom: string | null;
    writingStyleExamples: string | null;
  };
}

const PRESET_STYLES = [
  {
    value: "professional",
    label: "Professional",
    description: "Polished, formal tone with industry terminology"
  },
  {
    value: "casual",
    label: "Casual",
    description: "Friendly, conversational style with relaxed language"
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, approachable tone that builds rapport"
  },
  {
    value: "enthusiastic",
    label: "Enthusiastic",
    description: "Energetic, upbeat style with exclamation points"
  },
  {
    value: "educational",
    label: "Educational",
    description: "Informative, teaching-focused with clear explanations"
  }
];

export function WritingStyleSection({
  userId,
  initialData
}: WritingStyleSectionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [preset, setPreset] = React.useState(
    initialData.writingStylePreset || ""
  );
  const [customDescription, setCustomDescription] = React.useState(
    initialData.writingStyleCustom || ""
  );
  const [examples, setExamples] = React.useState<string[]>(() => {
    if (initialData.writingStyleExamples) {
      try {
        return JSON.parse(initialData.writingStyleExamples);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [newExampleUrl, setNewExampleUrl] = React.useState("");

  const handleAddExample = () => {
    if (newExampleUrl.trim() !== "") {
      setExamples([...examples, newExampleUrl.trim()]);
      setNewExampleUrl("");
    }
  };

  const handleRemoveExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateWritingStyle(userId, {
        writingStylePreset: preset || null,
        writingStyleCustom: customDescription || null,
        writingStyleExamples:
          examples.length > 0 ? JSON.stringify(examples) : null
      });

      toast.success("Writing style updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update writing style");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="writing-style" className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <PenTool className="h-6 w-6 text-amber-600" />
          Define Your Writing Style
        </h2>
        <p className="text-gray-600 mt-1">
          Help AI generate content that sounds like you
        </p>
      </div>

      <Card className="p-8 bg-gradient-to-br from-white to-gray-50/50 border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Preset Styles */}
          <div className="space-y-4">
            <Label className="text-gray-900 font-medium text-base">
              Choose a Writing Style Preset
            </Label>
            <RadioGroup value={preset} onValueChange={setPreset}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRESET_STYLES.map((style) => (
                  <label
                    key={style.value}
                    className="relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-amber-300 hover:bg-amber-50/50 has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50"
                  >
                    <RadioGroupItem value={style.value} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {style.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        {style.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Custom Description */}
          <div className="space-y-2">
            <Label
              htmlFor="customDescription"
              className="text-gray-900 font-medium"
            >
              Add Your Own Description (Optional)
            </Label>
            <Textarea
              id="customDescription"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="e.g., I love using emojis and keeping things light. I often use phrases like 'y'all' and 'let's dive in!'"
              rows={4}
              className="bg-white resize-none"
            />
            <p className="text-sm text-gray-500">
              Add specific phrases, emoji preferences, or tone adjustments
            </p>
          </div>

          {/* Writing Examples */}
          <div className="space-y-4 border-t pt-6">
            <div>
              <Label className="text-gray-900 font-medium text-base flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-gray-500" />
                Upload Writing Examples (Optional)
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Add URLs to screenshots of your social media posts
              </p>
            </div>

            {/* Example URLs Input */}
            <div className="flex gap-2">
              <Input
                value={newExampleUrl}
                onChange={(e) => setNewExampleUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddExample();
                  }
                }}
                placeholder="https://example.com/screenshot.png"
                className="bg-white"
              />
              <Button
                type="button"
                onClick={handleAddExample}
                disabled={!newExampleUrl.trim()}
                variant="outline"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Existing Examples */}
            {examples.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {examples.map((url, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white"
                  >
                    <img
                      src={url}
                      alt={`Writing example ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExample(index)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8"
            >
              {isLoading ? "Saving..." : "Save Writing Style"}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
