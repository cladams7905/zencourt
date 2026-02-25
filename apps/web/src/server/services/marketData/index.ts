import { createMarketDataService } from "./service";
export { createMarketDataProviderRegistry } from "./registry";

const marketDataService = createMarketDataService();

export const getMarketData = marketDataService.getMarketData;
export { createMarketDataService };
