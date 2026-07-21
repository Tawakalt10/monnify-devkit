import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Monnify webhook signature: HMAC-SHA512 over the RAW request body bytes,
 * hex-encoded, sent in the `monnify-signature` header.
 *
 * Critical: the signature is computed over the exact bytes sent on the wire.
 * Serialize the payload ONCE (compact JSON, no whitespace), sign those bytes,
 * send those bytes. Re-serializing on the receiving end breaks verification.
 */
export function computeSignature(rawBody: string | Buffer, secretKey: string): string {
  return createHmac("sha512", secretKey).update(rawBody).digest("hex");
}

export function verifySignature(
  rawBody: string | Buffer,
  secretKey: string,
  receivedSignature: string
): boolean {
  const expected = computeSignature(rawBody, secretKey);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(receivedSignature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Explain why a signature mismatch likely happened — used by `monnify verify`. */
export function diagnoseMismatch(rawBody: string, secretKey: string, received: string): string[] {
  const hints: string[] = [];
  if (!/^[0-9a-f]+$/i.test(received)) {
    hints.push("Received signature is not hex — Monnify signatures are hex-encoded HMAC-SHA512.");
  }
  if (received.length !== 128) {
    hints.push(`Received signature is ${received.length} chars; SHA512 hex is 128. Wrong algorithm?`);
  }
  const compact = JSON.stringify(JSON.parse(rawBody));
  if (compact !== rawBody && computeSignature(compact, secretKey) === received) {
    hints.push(
      "Signature matches the COMPACT serialization of this payload. Your framework re-serialized or pretty-printed the body — verify against the raw request bytes instead (e.g. express.raw())."
    );
  }
  if (hints.length === 0) {
    hints.push("Likely wrong secret key, or the body bytes were modified in transit (middleware, encoding).");
  }
  return hints;
}
