import { AIVisionError } from "./errors";

type RetryLogger = {
  debug: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

type RetryOptions = {
  timeout: number;
  maxRetries: number;
  timeoutMessage: string;
  failureContext: string;
};

function createTimeout(timeout: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new AIVisionError(message, "TIMEOUT"));
    }, timeout);
  });
}

export async function executeWithRetry<T>(params: {
  operation: () => Promise<T>;
  options: RetryOptions;
  logger: RetryLogger;
  sleep: (ms: number) => Promise<void>;
}): Promise<T> {
  const { operation, options, logger, sleep } = params;
  const { timeout, maxRetries, timeoutMessage, failureContext } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    logger.debug(
      {
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
        context: failureContext
      },
      "Executing OpenAI operation attempt"
    );

    try {
      return await Promise.race([
        operation(),
        createTimeout(timeout, timeoutMessage)
      ]);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message.toLowerCase() : "";

      if (message.includes("rate_limit")) {
        logger.warn({ context: failureContext }, "OpenAI rate limit encountered");
        throw new AIVisionError(
          "OpenAI API rate limit exceeded. Please try again later.",
          "RATE_LIMIT",
          error
        );
      }

      if (attempt === maxRetries) {
        break;
      }

      const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
      await sleep(waitTime);
    }
  }

  const failureMessage = lastError instanceof Error ? lastError.message : "Unknown error";
  logger.error(
    {
      context: failureContext,
      attempts: maxRetries + 1,
      error:
        lastError instanceof Error
          ? { name: lastError.name, message: lastError.message }
          : lastError
    },
    "OpenAI operation exhausted retries"
  );

  throw new AIVisionError(
    `Failed to ${failureContext} after ${maxRetries + 1} attempts: ${failureMessage ?? "Unknown error"}`,
    "API_ERROR",
    lastError
  );
}
