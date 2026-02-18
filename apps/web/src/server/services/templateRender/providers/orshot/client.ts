import { Orshot } from "orshot";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";

const logger = createChildLogger(baseLogger, { module: "orshot-client" });

type RenderTemplateParams = {
  templateId: string;
  modifications: Record<string, string>;
};

type CreateRendererDeps = {
  apiKey?: string;
  createClient?: (apiKey: string) => Orshot;
};

function getOrshotApiKey(override?: string): string {
  const key = (override ?? process.env.ORSHOT_API_KEY)?.trim();
  if (!key) {
    throw new Error("ORSHOT_API_KEY must be configured");
  }
  return key;
}

function decodeBase64ImageToDataUrl(base64Value: string): string {
  const trimmed = base64Value.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
}

export function createTemplateRenderer(
  deps: CreateRendererDeps = {}
): (params: RenderTemplateParams) => Promise<string> {
  const createClient = deps.createClient ?? ((apiKey: string) => new Orshot(apiKey));
  return async function renderTemplate({
    templateId,
    modifications
  }: RenderTemplateParams): Promise<string> {
    const client = createClient(getOrshotApiKey(deps.apiKey));

    const response = await client.renderFromTemplate({
      templateId,
      modifications,
      responseType: "base64",
      responseFormat: "png"
    });

    const maybeBase64 =
      typeof response === "string"
        ? response
        : typeof (response as { base64?: unknown })?.base64 === "string"
          ? ((response as { base64: string }).base64 ?? "")
          : typeof (response as { image?: unknown })?.image === "string"
            ? ((response as { image: string }).image ?? "")
            : typeof (response as { data?: unknown })?.data === "string"
              ? ((response as { data: string }).data ?? "")
              : "";

    if (!maybeBase64) {
      logger.error(
        { templateId, response },
        "Orshot render succeeded but returned no base64 image"
      );
      throw new Error("Orshot render returned an empty image response");
    }

    return decodeBase64ImageToDataUrl(maybeBase64);
  };
}

export const renderTemplate = createTemplateRenderer();
