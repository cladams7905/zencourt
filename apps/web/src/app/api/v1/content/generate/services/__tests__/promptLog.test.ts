/** @jest-environment node */

const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();

jest.mock("node:fs/promises", () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args)
}));

import { writePromptLog } from "../promptLog";

describe("content/generate services/promptLog", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV =
      originalNodeEnv;
    process.env.VERCEL = originalVercel;
  });

  it("does not write logs outside local development", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV =
      "production";
    delete process.env.VERCEL;

    await writePromptLog({
      userId: "user-1",
      systemPrompt: "sys",
      userPrompt: "user"
    });

    expect(mockMkdir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("writes logs in development when not on vercel", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV =
      "development";
    delete process.env.VERCEL;

    await writePromptLog({
      userId: "user-1",
      systemPrompt: "sys",
      userPrompt: "user"
    });

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("user-1.txt"),
      expect.stringContaining("=== SYSTEM PROMPT ==="),
      "utf8"
    );
  });
});
