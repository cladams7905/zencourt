import { EventEmitter } from "events";
import type { VideoStatus } from "@shared/types/models";

export interface VideoJobUpdateEvent {
  projectId: string;
  jobId: string;
  status: VideoStatus;
  videoUrl?: string | null;
  errorMessage?: string | null;
  roomId?: string | null;
  roomName?: string | null;
  sortOrder?: number | null;
}

export interface FinalVideoUpdateEvent {
  projectId: string;
  status: "completed" | "failed";
  finalVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  errorMessage?: string | null;
}

export interface InitialVideoStatusPayload {
  jobs: VideoJobUpdateEvent[];
  finalVideo?: {
    status?: string | null;
    finalVideoUrl?: string | null;
    thumbnailUrl?: string | null;
    duration?: number | null;
    errorMessage?: string | null;
  };
}

type VideoEventMap = {
  "video-job-update": VideoJobUpdateEvent;
  "video-final-update": FinalVideoUpdateEvent;
};

interface VideoEventsGlobal {
  __videoEventsEmitter?: EventEmitter;
}

const globalScope = globalThis as typeof globalThis & VideoEventsGlobal;

if (!globalScope.__videoEventsEmitter) {
  globalScope.__videoEventsEmitter = new EventEmitter();
}

const emitter = globalScope.__videoEventsEmitter;

type VideoEventName = keyof VideoEventMap;

function emitEvent<K extends VideoEventName>(
  eventName: K,
  payload: VideoEventMap[K]
): void {
  emitter.emit(eventName, payload);
}

function subscribeEvent<K extends VideoEventName>(
  eventName: K,
  listener: (payload: VideoEventMap[K]) => void
): () => void {
  const wrappedListener = (
    ...args: [VideoEventMap[K], ...unknown[]]
  ): void => {
    listener(args[0]);
  };

  emitter.on(eventName, wrappedListener);
  return () => {
    emitter.off(eventName, wrappedListener);
  };
}

export function emitVideoJobUpdate(event: VideoJobUpdateEvent): void {
  emitEvent("video-job-update", event);
}

export function emitFinalVideoUpdate(event: FinalVideoUpdateEvent): void {
  emitEvent("video-final-update", event);
}

export function subscribeToVideoJobUpdates(
  listener: (event: VideoJobUpdateEvent) => void
): () => void {
  return subscribeEvent("video-job-update", listener);
}

export function subscribeToFinalVideoUpdates(
  listener: (event: FinalVideoUpdateEvent) => void
): () => void {
  return subscribeEvent("video-final-update", listener);
}
