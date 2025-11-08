/**
 * Storage Proxy API Route
 *
 * Proxies upload/delete requests to the video-server (running on AWS ECS),
 * so all AWS S3 access happens outside the Vercel runtime.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function getVideoServerConfig() {
  const baseUrl = process.env.VIDEO_SERVER_URL;
  const apiKey = process.env.VIDEO_SERVER_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "VIDEO_SERVER_URL and VIDEO_SERVER_API_KEY must be configured for storage proxy"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

async function proxyFormData(
  url: string,
  apiKey: string,
  formData: FormData
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey
    },
    body: formData
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Video server upload failed");
  }

  return data;
}

async function proxyJson(
  url: string,
  apiKey: string,
  method: "POST" | "DELETE",
  body: unknown
) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Video server request failed");
  }

  return data;
}

export async function PUT(request: NextRequest) {
  try {
    const { baseUrl, apiKey } = getVideoServerConfig();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder =
      (formData.get("folder") as string | null) ?? request.nextUrl.searchParams.get("folder") ?? "uploads";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name);
    upstreamFormData.append("folder", folder);

    const result = await proxyFormData(
      `${baseUrl}/storage/upload`,
      apiKey,
      upstreamFormData
    );

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("[Storage Proxy] Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to upload to storage"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { baseUrl, apiKey } = getVideoServerConfig();
    const body = await request.json().catch(() => null);
    const url = body?.url as string | undefined;

    if (!url) {
      return NextResponse.json(
        { error: "No URL provided" },
        { status: 400 }
      );
    }

    await proxyJson(`${baseUrl}/storage/delete`, apiKey, "DELETE", { url });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Storage Proxy] Delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete from storage"
      },
      { status: 500 }
    );
  }
}
