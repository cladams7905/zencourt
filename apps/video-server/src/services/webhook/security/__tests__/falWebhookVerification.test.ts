import { createHash, generateKeyPairSync, sign } from "crypto";

function buildSignaturePayload(options: {
  requestId: string;
  userId: string;
  timestamp: string;
  rawBody: Buffer;
}): Buffer {
  const bodyHash = createHash("sha256").update(options.rawBody).digest("hex");
  const payload = `${options.requestId}\n${options.userId}\n${options.timestamp}\n${bodyHash}`;
  return Buffer.from(payload);
}

describe("verifyFalWebhookSignature", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("returns true for a valid signature", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const jwk = publicKey.export({ format: "jwk" }) as {
      kty: "OKP";
      crv: "Ed25519";
      x: string;
    };
    const rawBody = Buffer.from(JSON.stringify({ event: "done" }));
    const timestamp = String(Date.now());
    const requestId = "req_123";
    const userId = "usr_456";
    const payload = buildSignaturePayload({
      requestId,
      userId,
      timestamp,
      rawBody
    });
    const signatureHex = sign(null, payload, privateKey).toString("hex");

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ kty: jwk.kty, crv: jwk.crv, x: jwk.x }] })
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { verifyFalWebhookSignature } = await import(
      "@/services/webhook/security/falWebhookVerification"
    );

    await expect(
      verifyFalWebhookSignature({
        rawBody,
        requestId,
        userId,
        timestamp,
        signature: signatureHex
      })
    ).resolves.toBe(true);
  });

  it("rejects stale timestamps before JWKS lookup", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { verifyFalWebhookSignature } = await import(
      "@/services/webhook/security/falWebhookVerification"
    );

    const oldTimestamp = String(Date.now() - 10 * 60 * 1000);
    const result = await verifyFalWebhookSignature({
      rawBody: Buffer.from("{}"),
      requestId: "req_1",
      userId: "usr_1",
      timestamp: oldTimestamp,
      signature: "deadbeef"
    });

    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
