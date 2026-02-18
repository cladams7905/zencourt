import type { FredObservationResponse } from "../types";
import { pickObservationValue } from "../domain/transforms";
import { fetchWithTimeout } from "./http";
import { parseFredObservationResponse } from "./parsers";

type LoggerLike = {
  warn: (obj: unknown, msg?: string) => void;
};

const FRED_API_URL = "https://api.stlouisfed.org/fred/series/observations";

export async function getFredSeriesLatestValue(params: {
  seriesId: string;
  apiKey: string | null;
  fetcher: typeof fetch;
  logger: LoggerLike;
  timeoutMs: number;
}): Promise<number | null> {
  if (!params.apiKey) {
    return null;
  }

  const url = new URL(FRED_API_URL);
  url.searchParams.set("series_id", params.seriesId);
  url.searchParams.set("api_key", params.apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  let response: Response;
  try {
    response = await fetchWithTimeout(
      params.fetcher,
      url,
      { method: "GET" },
      params.timeoutMs
    );
  } catch (error) {
    params.logger.warn({ error, seriesId: params.seriesId }, "FRED request failed");
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    params.logger.warn(
      { status: response.status, errorText, seriesId: params.seriesId },
      "FRED request failed"
    );
    return null;
  }

  const payload = parseFredObservationResponse(await response.json());
  const observation = payload.observations?.[0];
  if (!observation || typeof observation !== "object") {
    return null;
  }

  return pickObservationValue(observation);
}
