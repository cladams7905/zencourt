import type { KlingSubmitInput } from "./types";

export interface KlingProviderFacade {
  submitRoomVideo(options: KlingSubmitInput): Promise<string>;
}
