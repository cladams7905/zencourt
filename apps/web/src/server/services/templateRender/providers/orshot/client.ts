import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";

const logger = createChildLogger(baseLogger, { module: "orshot-client" });

const ORSHOT_RENDER_URL = "https://api.orshot.com/v1/studio/render";

type RenderTemplateParams = {
  templateId: string;
  modifications: Record<string, string>;
};

type CreateRendererDeps = {
  apiKey?: string;
  fetchFn?: typeof fetch;
};

/** Single-page API response: data is an object with content */
type OrshotSinglePageResponse = {
  data: {
    content: string;
    format?: string;
    type?: string;
    responseTime?: number;
  };
  format?: string;
  type?: string;
  responseTime?: number;
};

/** Carousel API response: data is an array of { page, content } */
type OrshotCarouselResponse = {
  data: Array<{ page: number; content: string }>;
  format?: string;
  type?: string;
  responseTime?: number;
  totalPages?: number;
  renderedPages?: number;
};

type OrshotApiResponse = OrshotSinglePageResponse | OrshotCarouselResponse;

function isCarouselResponse(
  res: OrshotApiResponse
): res is OrshotCarouselResponse {
  return Array.isArray(res.data);
}

function getOrshotApiKey(override?: string): string {
  const key = (override ?? process.env.ORSHOT_API_KEY)?.trim();
  if (!key) {
    throw new Error("ORSHOT_API_KEY must be configured");
  }
  return key;
}

function normalizeImageContent(content: string): string {
  const trimmed = content.trim();
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
}

function extractContentString(res: OrshotApiResponse): string | null {
  if (isCarouselResponse(res)) {
    const first = res.data[0];
    return first && typeof first.content === "string" ? first.content : null;
  }
  const content = res.data?.content;
  return typeof content === "string" ? content : null;
}

export function createTemplateRenderer(
  deps: CreateRendererDeps = {}
): (params: RenderTemplateParams) => Promise<string> {
  return async function renderTemplate({
    templateId,
    modifications
  }: RenderTemplateParams): Promise<string> {
    const fetchFn = deps.fetchFn ?? fetch;
    const apiKey = getOrshotApiKey(deps.apiKey);
    const body = {
      templateId,
      modifications,
      response: { type: "url" as const, format: "png" as const }
    };

    const response = await fetchFn(ORSHOT_RENDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let detail: string;
      try {
        const json = (await response.json()) as {
          error?: string;
          message?: string;
        };
        detail = json.error ?? json.message ?? response.statusText;
      } catch {
        detail = response.statusText;
      }
      logger.error(
        { templateId, status: response.status, detail },
        "Orshot render API error"
      );
      throw new Error(`Orshot render failed: ${response.status} ${detail}`);
    }

    const raw = (await response.json()) as OrshotApiResponse;
    const content = extractContentString(raw);
    if (!content) {
      logger.error(
        { templateId, response: raw },
        "Orshot render succeeded but returned no image content"
      );
      throw new Error("Orshot render returned an empty image response");
    }

    return normalizeImageContent(content);
  };
}

export const renderTemplate = createTemplateRenderer();
