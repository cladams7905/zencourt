import logger from "@/config/logger";

type ProviderMetricsRecord = {
  attempts: number;
  successes: number;
  failures: number;
};

const providerMetrics = new Map<string, ProviderMetricsRecord>();

function getRecord(provider: string): ProviderMetricsRecord {
  const existing = providerMetrics.get(provider);
  if (existing) return existing;
  const initial: ProviderMetricsRecord = { attempts: 0, successes: 0, failures: 0 };
  providerMetrics.set(provider, initial);
  return initial;
}

export function recordProviderAttempt(provider: string): void {
  getRecord(provider).attempts += 1;
}

export function recordProviderSuccess(provider: string): void {
  getRecord(provider).successes += 1;
}

export function recordProviderFailure(provider: string): void {
  getRecord(provider).failures += 1;
}

export function logProviderMetricsSnapshot(context: { jobId: string; provider: string }): void {
  const record = getRecord(context.provider);
  logger.info(
    {
      jobId: context.jobId,
      provider: context.provider,
      providerMetrics: record
    },
    "[VideoGenerationService] Provider metrics snapshot"
  );
}
