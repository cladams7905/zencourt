import { createMarketDataService } from "./service";

const marketDataService = createMarketDataService();

export const getMarketData = marketDataService.getMarketData;
