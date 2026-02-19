import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_LOGS_DIR = "src/lib/ai/prompts/content/logs";

function shouldWritePromptLog(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.VERCEL;
}

export async function writePromptLog(payload: {
  userId: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<void> {
  if (!shouldWritePromptLog()) {
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${timestamp}_${payload.userId}.txt`;
  const outputDir = path.join(process.cwd(), OUTPUT_LOGS_DIR);
  const outputPath = path.join(outputDir, filename);
  const content = [
    "=== SYSTEM PROMPT ===",
    payload.systemPrompt,
    "",
    "=== USER PROMPT ===",
    payload.userPrompt,
    ""
  ].join("\n");

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, content, "utf8");
}
