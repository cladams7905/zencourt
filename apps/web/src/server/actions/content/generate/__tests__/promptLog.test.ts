const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();

jest.mock("node:fs/promises", () => ({
  mkdir: (...args: unknown[]) =>
    (mockMkdir as (...a: unknown[]) => unknown)(...args),
  writeFile: (...args: unknown[]) =>
    (mockWriteFile as (...a: unknown[]) => unknown)(...args)
}));

import { writePromptLog } from "@web/src/server/actions/content/generate/promptLog";

describe("contentGeneration promptLog", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockMkdir.mockReset();
    mockWriteFile.mockReset();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("does not write when NODE_ENV is not development", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    process.env.VERCEL = undefined;

    await writePromptLog({
      userId: "user-1",
      systemPrompt: "system",
      userPrompt: "user"
    });

    expect(mockMkdir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("does not write when VERCEL is set", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    process.env.VERCEL = "1";

    await writePromptLog({
      userId: "user-1",
      systemPrompt: "system",
      userPrompt: "user"
    });

    expect(mockMkdir).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("writes file when NODE_ENV is development and VERCEL is not set", async () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    delete process.env.VERCEL;
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await writePromptLog({
      userId: "user-1",
      systemPrompt: "System prompt content",
      userPrompt: "User prompt content"
    });

    expect(mockMkdir).toHaveBeenCalledWith(
      expect.stringContaining("src/lib/ai/prompts/content/logs"),
      { recursive: true }
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/\d{4}-\d{2}-\d{2}T.*_user-1\.txt$/),
      expect.stringContaining("=== SYSTEM PROMPT ==="),
      "utf8"
    );
    const content = mockWriteFile.mock.calls[0][1];
    expect(content).toContain("System prompt content");
    expect(content).toContain("=== USER PROMPT ===");
    expect(content).toContain("User prompt content");
  });
});
