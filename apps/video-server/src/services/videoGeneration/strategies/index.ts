import { klingStrategy } from "./klingStrategy";
import { runwayStrategy } from "./runwayStrategy";
import { wavespeedStrategy } from "./wavespeedStrategy";

export { klingStrategy, runwayStrategy, wavespeedStrategy };

export const primaryProviderStrategies = [
  wavespeedStrategy,
  runwayStrategy,
  klingStrategy
];
export const fallbackProviderStrategies = [runwayStrategy, klingStrategy];
