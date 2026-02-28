import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function resolvePropertyDetailsLogsDir(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(path.join("apps", "web"))) {
    return path.join(cwd, "src", "server", "services", "propertyDetails", "logs");
  }
  return path.join(
    cwd,
    "apps",
    "web",
    "src",
    "server",
    "services",
    "propertyDetails",
    "logs"
  );
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return JSON.stringify(
      {
        error: "Unable to serialize payload",
        fallback: String(value)
      },
      null,
      2
    );
  }
}

export async function writePropertyDetailsProviderLog(params: {
  provider: string;
  address: string;
  query: {
    systemPrompt: string;
    userPrompt: string;
    responseFormat: unknown;
    providerRequest?: unknown;
    openHouseOnly?: {
      systemPrompt: string;
      userPrompt: string;
      responseFormat: unknown;
      providerRequest?: unknown;
    };
  };
  response: unknown;
  openHouseOnlyResponse?: unknown;
}): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const fileStamp = timestamp.replace(/[:.]/g, "-");
  const fileName = `${fileStamp}-${params.provider}.json`;
  const logsDir = resolvePropertyDetailsLogsDir();
  const filePath = path.join(logsDir, fileName);

  const payload = {
    timestamp,
    provider: params.provider,
    address: params.address,
    query: params.query,
    response: params.response,
    openHouseOnlyResponse: params.openHouseOnlyResponse
  };

  try {
    await mkdir(logsDir, { recursive: true });
    await writeFile(filePath, safeJson(payload), "utf-8");
  } catch {
    // Best-effort debug logging only.
  }
}
