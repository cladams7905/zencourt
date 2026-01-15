"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@web/src/components/ui/card";
import { Label } from "@web/src/components/ui/label";
import { Button } from "@web/src/components/ui/button";
import { Input } from "@web/src/components/ui/input";
import { Film, Image as ImageIcon, X, Upload } from "lucide-react";
import {
  addUserMedia,
  deleteUserMedia,
  getUserMedia
} from "@web/src/server/actions/db/userMedia";
import type { DBUserMedia } from "@shared/types/models";
import { toast } from "sonner";

interface MediaSectionProps {
  userId: string;
}

export function MediaSection({ userId }: MediaSectionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [media, setMedia] = React.useState<DBUserMedia[]>([]);
  const [newMediaUrl, setNewMediaUrl] = React.useState("");
  const [newMediaType, setNewMediaType] = React.useState<"image" | "video">(
    "image"
  );

  // Fetch existing media on mount
  React.useEffect(() => {
    const fetchMedia = async () => {
      try {
        const data = await getUserMedia(userId);
        setMedia(data);
      } catch (error) {
        toast.error("Failed to load media");
      }
    };

    fetchMedia();
  }, [userId]);

  const handleAddMedia = async () => {
    if (!newMediaUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    try {
      const newMedia = await addUserMedia(userId, {
        type: newMediaType,
        url: newMediaUrl.trim(),
        storageKey: null,
        thumbnailUrl: null,
        metadata: null
      });

      setMedia([newMedia, ...media]);
      setNewMediaUrl("");
      toast.success("Media added successfully!");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to add media");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    try {
      await deleteUserMedia(userId, mediaId);
      setMedia(media.filter((m) => m.id !== mediaId));
      toast.success("Media deleted successfully!");
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete media");
    }
  };

  return (
    <section id="media" className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Film className="h-6 w-6 text-amber-600" />
          Upload Media
        </h2>
        <p className="text-gray-600 mt-1">
          Add images and videos to use as b-roll footage for your content
        </p>
      </div>

      <Card className="p-8 bg-gradient-to-br from-white to-gray-50/50 border-gray-200">
        <div className="space-y-6">
          {/* Add Media Section */}
          <div className="space-y-4">
            <Label className="text-gray-900 font-medium text-base">
              Add New Media
            </Label>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMedia();
                    }
                  }}
                  placeholder="https://example.com/image.jpg or video.mp4"
                  className="bg-white"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newMediaType === "image" ? "default" : "outline"}
                  onClick={() => setNewMediaType("image")}
                  className="gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Image
                </Button>
                <Button
                  type="button"
                  variant={newMediaType === "video" ? "default" : "outline"}
                  onClick={() => setNewMediaType("video")}
                  className="gap-2"
                >
                  <Film className="h-4 w-4" />
                  Video
                </Button>
                <Button
                  type="button"
                  onClick={handleAddMedia}
                  disabled={isLoading || !newMediaUrl.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              For now, provide direct URLs to your media files. File upload
              coming soon.
            </p>
          </div>

          {/* Media Grid */}
          {media.length > 0 && (
            <div className="border-t pt-6">
              <div className="mb-4 flex items-center justify-between">
                <Label className="text-gray-900 font-medium text-base">
                  Your Media Library ({media.length})
                </Label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white"
                  >
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt="Media"
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-900 flex items-center justify-center">
                        <Film className="h-8 w-8 text-white" />
                      </div>
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/70 text-white text-xs font-medium">
                      {item.type}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteMedia(item.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* URL preview on hover */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                      {item.url}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {media.length === 0 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Film className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-1">
                No media uploaded yet
              </p>
              <p className="text-sm text-gray-500">
                Add your first image or video above to get started
              </p>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
