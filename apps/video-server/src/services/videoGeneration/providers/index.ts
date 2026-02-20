import { klingStrategy } from "./klingStrategy";
import { runwayStrategy } from "./runwayStrategy";

export { klingStrategy, runwayStrategy };

export const primaryProviderStrategies = [runwayStrategy, klingStrategy];
export const fallbackProviderStrategies = [klingStrategy];
