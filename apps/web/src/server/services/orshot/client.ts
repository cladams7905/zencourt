import { Orshot } from "orshot";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";

const logger = createChildLogger(baseLogger, { module: "orshot-client" });

let cachedClient: Orshot | null = null;

function getOrshotApiKey(): string {
  const key = process.env.ORSHOT_API_KEY?.trim();
  if (!key) {
    throw new Error("ORSHOT_API_KEY must be configured");
  }
  return key;
}

function getOrshotClient(): Orshot {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new Orshot(getOrshotApiKey());
  return cachedClient;
}

type RenderTemplateParams = {
  templateId: string;
  modifications: Record<string, string>;
};

function decodeBase64ImageToDataUrl(base64Value: string): string {
  const trimmed = base64Value.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
}

export async function renderOrshotTemplate({
  templateId,
  modifications
}: RenderTemplateParams): Promise<string> {
  const client = getOrshotClient();

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
}
