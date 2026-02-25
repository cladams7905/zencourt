import type { PropertyDetailsProvider } from "./types";
import {
  createPerplexityPropertyDetailsProvider
} from "./perplexity";
import type { RunStructuredPropertyQuery } from "./types";

export type { PropertyDetailsProvider, RunStructuredPropertyQuery } from "./types";
export { createPerplexityPropertyDetailsProvider };

export function getDefaultPropertyDetailsProvider(deps: {
  runStructuredQuery: RunStructuredPropertyQuery;
}): PropertyDetailsProvider {
  return createPerplexityPropertyDetailsProvider(deps);
}
