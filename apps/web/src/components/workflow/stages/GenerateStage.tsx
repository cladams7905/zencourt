"use client";

import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { ScrollArea } from "../../ui/scroll-area";
import { VerticalTimeline } from "../VerticalTimeline";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../../ui/alert-dialog";
import type {
  GenerationProgress,
  RoomGenerationStatus
} from "../../../types/workflow";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Play
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface GenerateStageProps {
  progress: GenerationProgress;
  projectId?: string;
  rooms?: RoomGenerationStatus[];
  onCancel?: () => void;
  onRetry?: () => void;
}

export function GenerateStage({
  progress,
  projectId,
  rooms = [],
  onCancel,
  onRetry
}: GenerateStageProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [videoData, setVideoData] = useState<{
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number;
  } | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const totalRooms = rooms.length;
  const completedRooms = rooms.filter((room) => room.status === "completed").length;
  const failedRooms = rooms.filter((room) => room.status === "failed");
  const showRoomStatuses = totalRooms > 0;

  const isGenerating =
    progress.steps?.some((s) => s.status === "in-progress") ||
    progress.steps?.some((s) => s.status === "waiting") ||
    false;

  const isComplete =
    progress.steps?.every((s) => s.status === "completed") || false;

  const hasFailed = progress.steps?.some((s) => s.status === "failed") || false;

  // Fetch video data when generation is complete
  useEffect(() => {
    if (!isComplete || !projectId || videoData || isLoadingVideo) {
      return;
    }

    // Fetch video with polling every 5 seconds until we get the data
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchVideo = async () => {
      if (isLoadingVideo) return;

      setIsLoadingVideo(true);
      try {
        const res = await fetch(`/api/v1/generation/video/${projectId}`);
        const data = await res.json();

        // Check both data.video.videoUrl (API format) and data.videoUrl (fallback)
        const videoUrl = data.video?.videoUrl || data.videoUrl;

        if (videoUrl) {
          setVideoData({
            videoUrl: data.video?.videoUrl || data.videoUrl,
            thumbnailUrl: data.video?.thumbnailUrl || data.thumbnailUrl,
            duration: data.video?.duration || data.duration
          });

          // Stop polling once we have the video
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch (error) {
        console.error("Failed to fetch video data:", error);
      } finally {
        setIsLoadingVideo(false);
      }
    };

    // Initial fetch
    fetchVideo();

    // Poll every 2 seconds for faster response
    pollInterval = setInterval(fetchVideo, 2000);

    // Cleanup on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isComplete, isLoadingVideo, videoData, projectId]);

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    setShowCancelDialog(false);

    // Call cancel API endpoint if we have a projectId
    if (projectId) {
      try {
        const response = await fetch(`/api/generation/cancel/${projectId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reason: "User canceled generation from workflow"
          })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message = data?.message || data?.error || "Failed to cancel generation";
          throw new Error(message);
        }
      } catch (error) {
        console.error("Failed to cancel generation:", error);
      }
    }

    // Call the onCancel callback to stop polling and reset UI
    onCancel?.();
  };

  const handleDownloadVideo = async () => {
    if (videoData?.videoUrl) {
      try {
        // Fetch the video as a blob to handle cross-origin URLs properly
        const response = await fetch(videoData.videoUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch video");
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `video-${projectId}.mp4`;
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Failed to download video:", error);
        // Fallback to direct link if fetch fails
        window.open(videoData.videoUrl, "_blank");
      }
    }
  };

  const handleOpenRoomVideo = (videoUrl: string) => {
    window.open(videoUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6">
          {/* Time Estimate */}
          {isGenerating && progress.estimatedTimeRemaining > 0 && (
            <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Clock className="w-5 h-5" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Estimated Time Remaining
                  </p>
                  <p className="text-2xl font-bold">
                    {formatTimeRemaining(progress.estimatedTimeRemaining)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overall Progress */}
          {isGenerating && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-semibold">
                  {Math.round(progress.overallProgress)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress.overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Generation Steps Timeline - Hide when video preview is shown */}
          {!videoData && (
            <div className="max-w-2xl mx-auto">
              <VerticalTimeline steps={progress.steps || []} />
            </div>
          )}

          {/* Room-Level Progress */}
          {showRoomStatuses && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-base font-semibold">Room Clip Progress</h4>
                  <p className="text-sm text-muted-foreground">
                    Track each room&apos;s clip as it makes it through the queue.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {completedRooms}/{totalRooms} completed
                  {failedRooms.length > 0 && (
                    <span className="ml-2 text-red-600">
                      {failedRooms.length} failed
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {rooms.map((room, index) => {
                  const statusMeta = ROOM_STATUS_META[room.status] ?? ROOM_STATUS_META.processing;
                  const StatusIcon = statusMeta.icon;
                  const displayName = formatRoomDisplayName(room, index);

                  return (
                    <div
                      key={room.id}
                      className="rounded-lg border border-gray-200 bg-white/80 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {displayName}
                          </p>
                          {room.roomId && (
                            <p className="text-xs text-muted-foreground">
                              Room ID: {room.roomId}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          <StatusIcon
                            className={`h-4 w-4 ${statusMeta.iconClasses || ""}`}
                          />
                          {statusMeta.label}
                        </span>
                      </div>

                      {room.status === "failed" && room.errorMessage && (
                        <p className="mt-3 text-sm text-red-600">
                          {room.errorMessage}
                        </p>
                      )}

                      {room.status === "completed" && room.videoUrl && (
                        <Button
                          onClick={() => handleOpenRoomVideo(room.videoUrl!)}
                          variant="ghost"
                          size="sm"
                          className="mt-3 h-auto px-0 text-primary"
                        >
                          <Play className="h-4 w-4" />
                          Preview clip
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Video Preview - Show directly without success card */}
          {isComplete && (
            <div className="mt-8 space-y-6">
              {videoData && (
                <div className="p-6 bg-white border border-gray-200 rounded-lg">
                  <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Video Preview
                  </h4>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                    <video
                      controls
                      className="w-full h-full"
                      poster={videoData.thumbnailUrl}
                    >
                      <source src={videoData.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Duration: {Math.round(videoData.duration)}s
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
              )}

              {/* Loading Video */}
              {isLoadingVideo && (
                <div className="p-6 bg-white border border-gray-200 rounded-lg text-center">
                  <div className="animate-spin w-8 h-8 mx-auto mb-3 border-4 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading video...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {hasFailed && !isGenerating && (
            <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-lg text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-500 text-white rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Generation Failed
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  Some items could not be generated. Please check the errors
                  above and try again.
                </p>
              </div>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Retry Failed Items
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {isGenerating && onCancel && (
        <div className="px-6 py-4 border-t bg-white">
          <Button
            onClick={handleCancelClick}
            variant="outline"
            className="w-full"
          >
            Cancel Generation
          </Button>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Generation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the generation process? Any
              progress will be lost and you&apos;ll need to start over.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Generating</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Format time remaining in seconds to human-readable format
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds === 0
      ? `${minutes}m`
      : `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

interface RoomStatusMeta {
  label: string;
  className: string;
  icon: LucideIcon;
  iconClasses?: string;
}

const ROOM_STATUS_META: Record<
  RoomGenerationStatus["status"],
  RoomStatusMeta
> = {
  completed: {
    label: "Completed",
    className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2
  },
  processing: {
    label: "Processing",
    className: "border border-blue-200 bg-blue-50 text-blue-700",
    icon: Loader2,
    iconClasses: "animate-spin"
  },
  pending: {
    label: "Queued",
    className: "border border-slate-200 bg-slate-50 text-slate-600",
    icon: Clock
  },
  failed: {
    label: "Failed",
    className: "border border-red-200 bg-red-50 text-red-600",
    icon: AlertTriangle
  }
};

function formatRoomDisplayName(
  room: RoomGenerationStatus,
  index: number
): string {
  if (room.roomName?.trim()) {
    return room.roomName;
  }

  if (room.roomId?.trim()) {
    return humanizeIdentifier(room.roomId);
  }

  return `Room ${index + 1}`;
}

function humanizeIdentifier(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
