import { createHash, createPublicKey, verify as verifySignature } from "crypto";
import logger from "@/config/logger";

type FalJwkKey = {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
  kid?: string;
};

type FalJwks = {
  keys: FalJwkKey[];
};

const JWKS_URL = "https://rest.alpha.fal.ai/.well-known/jwks.json";
const JWKS_CACHE_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

let jwksCache: { keys: FalJwkKey[]; fetchedAt: number } | null = null;

export function resetFalJwksCacheForTests(): void {
  if (process.env.NODE_ENV === "test") {
    jwksCache = null;
  }
}

function parseTimestamp(timestamp: string): number | null {
  const numeric = Number(timestamp);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (numeric < 1e12) {
    return numeric * 1000;
  }
  return numeric;
}

async function fetchFalJwks(): Promise<FalJwkKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_MS) {
    return jwksCache.keys;
  }

  const response = await fetch(JWKS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Fal JWKS (${response.status})`);
  }

  const data = (await response.json()) as FalJwks;
  if (!data?.keys?.length) {
    throw new Error("Fal JWKS missing keys");
  }

  jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

function buildPayload(
  requestId: string,
  userId: string,
  timestamp: string,
  bodyHash: string
): string {
  return `${requestId}\n${userId}\n${timestamp}\n${bodyHash}`;
}

function verifyWithKeys(
  payload: string,
  signatureHex: string,
  keys: FalJwkKey[]
): boolean {
  const signature = Buffer.from(signatureHex, "hex");
  const data = Buffer.from(payload);

  for (const key of keys) {
    try {
      const publicKey = createPublicKey({
        key: {
          kty: key.kty,
          crv: key.crv,
          x: key.x
        },
        format: "jwk"
      });
      if (verifySignature(null, data, publicKey, signature)) {
        return true;
      }
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "[FalWebhookVerification] Failed to verify with key"
      );
    }
  }
  return false;
}

export async function verifyFalWebhookSignature(options: {
  rawBody: Buffer;
  requestId: string;
  userId: string;
  timestamp: string;
  signature: string;
}): Promise<boolean> {
  const timestampMs = parseTimestamp(options.timestamp);
  if (!timestampMs) {
    return false;
  }

  const now = Date.now();
  if (Math.abs(now - timestampMs) > WEBHOOK_TOLERANCE_MS) {
    return false;
  }

  const bodyHash = createHash("sha256")
    .update(options.rawBody)
    .digest("hex");

  const payload = buildPayload(
    options.requestId,
    options.userId,
    options.timestamp,
    bodyHash
  );

  const keys = await fetchFalJwks();
  return verifyWithKeys(payload, options.signature, keys);
}
