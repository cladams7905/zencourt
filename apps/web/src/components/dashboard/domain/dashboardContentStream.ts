import {
  type DashboardContentCategory,
  type DashboardGenerationEvent
} from "@web/src/components/dashboard/shared";
import { fetchStreamResponse } from "@web/src/lib/client/http";
import { streamSseEvents } from "@web/src/lib/sse/sseEventStream";

export async function requestDashboardContentStream(params: {
  category: DashboardContentCategory;
  filterFocus: string;
  agentProfile: {
    agent_name: string;
    brokerage_name: string;
    agent_title: string;
    city: string;
    state: string;
    zip_code: string;
    service_areas: string;
    writing_style_description: string;
  };
  signal: AbortSignal;
}): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const response = await fetchStreamResponse(
    "/api/v1/content/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: params.category,
        audience_segments: ["first_time_buyers"],
        agent_profile: params.agentProfile,
        content_request: {
          platform: "instagram",
          content_type: "social_post",
          focus: params.filterFocus
        }
      }),
      signal: params.signal
    },
    "Failed to generate content"
  );

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response not available");
  }

  return reader;
}

export async function* streamDashboardContentEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<DashboardGenerationEvent> {
  for await (const event of streamSseEvents<DashboardGenerationEvent>(reader)) {
    yield event;
  }
}
