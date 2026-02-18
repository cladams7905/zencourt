import {
  type DashboardContentCategory,
  type DashboardGenerationEvent
} from "@web/src/components/dashboard/shared";

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
  const response = await fetch("/api/v1/content/generate", {
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
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(
      (errorPayload as { message?: string })?.message ||
        "Failed to generate content"
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response not available");
  }

  return reader;
}

export async function* streamDashboardContentEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<DashboardGenerationEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((entry) => entry.startsWith("data:"));
      if (!line) {
        continue;
      }

      const payload = line.replace(/^data:\s*/, "");
      if (!payload) {
        continue;
      }

      const event = JSON.parse(payload) as DashboardGenerationEvent;
      yield event;
    }
  }
}
