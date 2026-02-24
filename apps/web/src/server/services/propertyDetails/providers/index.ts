import type { PropertyDetailsProvider } from "./types";
import { perplexityPropertyDetailsProvider } from "./perplexity";

export type { PropertyDetailsProvider } from "./types";
export { perplexityPropertyDetailsProvider };

export function getDefaultPropertyDetailsProvider(): PropertyDetailsProvider {
  return perplexityPropertyDetailsProvider;
}
