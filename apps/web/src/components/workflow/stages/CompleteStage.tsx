"use client";

import { Button } from "../../ui/button";
import { ScrollArea } from "../../ui/scroll-area";
import { CheckCircle2, Download, Play, Loader2 } from "lucide-react";
import type { FinalVideoData } from "@web/src/types/workflow";

interface CompleteStageProps {
  finalVideo: FinalVideoData | null;
  projectId?: string;
}

export function CompleteStage({
  finalVideo,
  projectId
}: CompleteStageProps) {
  const handleDownloadVideo = async () => {
    if (!finalVideo?.videoUrl) {
      return;
    }

    try {
      const response = await fetch(finalVideo.videoUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch video");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `video-${projectId ?? "project"}.mp4`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download video:", error);
      window.open(finalVideo.videoUrl, "_blank");
    }
  };

  if (!finalVideo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        <div className="text-center space-y-1">
          <p className="font-medium text-foreground">Preparing final video…</p>
          <p className="text-sm">
            Hang tight while we fetch the composed video.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-6">
          <div className="flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <h3 className="text-2xl font-semibold">Your video is ready!</h3>
            <p className="text-sm text-muted-foreground">
              Preview the composed property video and download it to share with
              clients.
            </p>
          </div>

          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
              <Play className="w-5 h-5" />
              Final Video
            </h4>
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <video
                controls
                className="w-full h-full"
                poster={finalVideo.thumbnailUrl ?? undefined}
              >
                <source src={finalVideo.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Duration: {Math.round(finalVideo.duration ?? 0)}s
              </div>
              <Button
                onClick={handleDownloadVideo}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Video
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
