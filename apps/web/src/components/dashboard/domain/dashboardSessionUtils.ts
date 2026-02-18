import {
  DASHBOARD_CONTENT_TYPES,
  DEFAULT_GENERATED_STATE,
  SESSION_TTL_MS,
  type DashboardContentType,
  type GeneratedContentState
} from "@web/src/components/dashboard/shared";

type SessionPayload = {
  expiresAt: number;
  data: GeneratedContentState;
};

export function cloneDefaultGeneratedState(): GeneratedContentState {
  return {
    videos: {
      ...DEFAULT_GENERATED_STATE.videos
    },
    posts: {
      ...DEFAULT_GENERATED_STATE.posts
    },
    stories: {
      ...DEFAULT_GENERATED_STATE.stories
    }
  };
}

export function parseGeneratedContentSession(
  rawValue: string | null,
  now = Date.now()
): GeneratedContentState | null {
  if (!rawValue) {
    return null;
  }

  let parsed: SessionPayload;
  try {
    parsed = JSON.parse(rawValue) as SessionPayload;
  } catch {
    return null;
  }

  if (!parsed?.expiresAt || parsed.expiresAt < now || !parsed.data) {
    return null;
  }

  const normalized = cloneDefaultGeneratedState();

  for (const type of DASHBOARD_CONTENT_TYPES) {
    normalized[type] = normalizeTypeEntries(parsed.data[type]);
  }

  return normalized;
}

function normalizeTypeEntries(
  entries: GeneratedContentState[DashboardContentType]
): GeneratedContentState[DashboardContentType] {
  return Object.fromEntries(
    Object.entries(entries ?? {}).map(([key, items]) => [
      key,
      (items ?? []).filter((item) => !item.id.startsWith("stream-"))
    ])
  ) as GeneratedContentState[DashboardContentType];
}

export function serializeGeneratedContentSession(
  data: GeneratedContentState,
  now = Date.now()
): string {
  return JSON.stringify({
    expiresAt: now + SESSION_TTL_MS,
    data
  });
}
