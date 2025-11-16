import { NextRequest, NextResponse } from "next/server";
import { db, videoJobs, videos } from "@db/client";
import { asc, desc, eq } from "drizzle-orm";
import { requireAuthenticatedUser, requireProjectAccess } from "../../_utils";
import {
  subscribeToFinalVideoUpdates,
  subscribeToVideoJobUpdates,
  type FinalVideoUpdateEvent,
  type InitialVideoStatusPayload,
  type VideoJobUpdateEvent
} from "@web/src/types/video-events";

export const runtime = "nodejs";

async function getInitialVideoState(
  projectId: string
): Promise<InitialVideoStatusPayload> {
  const latestVideoResult = await db
    .select({
      id: videos.id,
      status: videos.status,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      errorMessage: videos.errorMessage,
      metadata: videos.metadata
    })
    .from(videos)
    .where(eq(videos.projectId, projectId))
    .orderBy(desc(videos.createdAt))
    .limit(1);

  const latestVideo = latestVideoResult[0];

  let jobs: VideoJobUpdateEvent[] = [];

  if (latestVideo) {
    const jobRows = await db
      .select({
        id: videoJobs.id,
        status: videoJobs.status,
        videoUrl: videoJobs.videoUrl,
        errorMessage: videoJobs.errorMessage,
        generationSettings: videoJobs.generationSettings
      })
      .from(videoJobs)
      .where(eq(videoJobs.videoId, latestVideo.id))
      .orderBy(asc(videoJobs.createdAt));

    jobs = jobRows.map((job) => ({
      projectId,
      jobId: job.id,
      status: job.status,
      videoUrl: job.videoUrl,
      errorMessage: job.errorMessage,
      roomId: job.generationSettings?.roomId,
      roomName: job.generationSettings?.roomName,
      sortOrder: job.generationSettings?.sortOrder ?? null
    }));
  }

  const finalVideo = latestVideo
    ? {
        status: latestVideo.status,
        finalVideoUrl: latestVideo.videoUrl,
        thumbnailUrl: latestVideo.thumbnailUrl,
        duration: latestVideo.metadata?.duration ?? null,
        errorMessage: latestVideo.errorMessage ?? null
      }
    : undefined;

  return {
    jobs,
    finalVideo
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      {
        success: false,
        error: "ProjectIdMissing",
        message: "projectId query parameter is required"
      },
      { status: 400 }
    );
  }

  const user = await requireAuthenticatedUser();
  await requireProjectAccess(projectId, user.id);

  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: {
        type: "initial" | "job-update" | "final-update";
        payload:
          | InitialVideoStatusPayload
          | VideoJobUpdateEvent
          | FinalVideoUpdateEvent;
      }) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      (async () => {
        try {
          const initialPayload = await getInitialVideoState(projectId);
          sendEvent({ type: "initial", payload: initialPayload });
        } catch (error) {
          console.error("Failed to load initial video state:", error);
          controller.error(error);
        }
      })();

      const jobUnsubscribe = subscribeToVideoJobUpdates((event) => {
        if (event.projectId !== projectId) {
          return;
        }
        sendEvent({ type: "job-update", payload: event });
      });

      const finalUnsubscribe = subscribeToFinalVideoUpdates((event) => {
        if (event.projectId !== projectId) {
          return;
        }
        sendEvent({ type: "final-update", payload: event });
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15000);

      const abortHandler = () => {
        cleanup();
        controller.close();
      };

      request.signal.addEventListener("abort", abortHandler);

      cleanup = () => {
        jobUnsubscribe();
        finalUnsubscribe();
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", abortHandler);
      };
    },
    cancel() {
      cleanup();
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
