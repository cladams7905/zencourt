import type { RunwaySubmitInput } from "./types";

export interface RunwayProviderFacade {
  submitImageToVideo(options: RunwaySubmitInput): Promise<{
    id: string;
    waitForTaskOutput: () => Promise<{ output?: Array<{ uri?: string }> }>;
  }>;
}
