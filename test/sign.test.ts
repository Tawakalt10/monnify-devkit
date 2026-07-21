import { describe, it, expect } from "vitest";
import { computeSignature, verifySignature, diagnoseMismatch } from "../src/webhooks/sign.js";
import { buildPayload, EVENT_TYPES } from "../src/webhooks/payloads.js";

const SECRET = "TEST_SECRET_KEY";

describe("computeSignature", () => {
  it("produces a 128-char hex HMAC-SHA512", () => {
    const sig = computeSignature('{"eventType":"SUCCESSFUL_TRANSACTION"}', SECRET);
    expect(sig).toMatch(/^[0-9a-f]{128}$/);
  });

  it("golden vector: known input produces known output", () => {
    // Deterministic: HMAC-SHA512("hello", "key")
    const sig = computeSignature("hello", "key");
    expect(sig).toBe(
      "ff06ab36757777815c008d32c8e14a705b4e7bf310351a06a23b612dc4c7433e7757d20525a5593b71020ea2ee162d2311b247e9855862b270122419652c0c92"
    );
  });

  it("is byte-sensitive: pretty-printed JSON produces a different signature", () => {
    const payload = { eventType: "SUCCESSFUL_TRANSACTION", eventData: { amount: 100 } };
    const compact = JSON.stringify(payload);
    const pretty = JSON.stringify(payload, null, 2);
    expect(computeSignature(compact, SECRET)).not.toBe(computeSignature(pretty, SECRET));
  });
});

describe("verifySignature", () => {
  it("accepts a valid signature", () => {
    const body = JSON.stringify(buildPayload("SUCCESSFUL_TRANSACTION"));
    const sig = computeSignature(body, SECRET);
    expect(verifySignature(body, SECRET, sig)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify(buildPayload("SUCCESSFUL_TRANSACTION", { amount: 100 }));
    const sig = computeSignature(body, SECRET);
    const tampered = body.replace("100", "999");
    expect(verifySignature(tampered, SECRET, sig)).toBe(false);
  });

  it("rejects wrong-length signatures without throwing", () => {
    expect(verifySignature("body", SECRET, "deadbeef")).toBe(false);
  });
});

describe("diagnoseMismatch", () => {
  it("detects the re-serialization footgun", () => {
    const payload = { eventType: "SETTLEMENT", eventData: { amount: "5000" } };
    const compact = JSON.stringify(payload);
    const pretty = JSON.stringify(payload, null, 2);
    const sigOverCompact = computeSignature(compact, SECRET);
    const hints = diagnoseMismatch(pretty, SECRET, sigOverCompact);
    expect(hints.join(" ")).toContain("COMPACT");
  });
});

describe("buildPayload", () => {
  it("builds every advertised event type", () => {
    for (const event of EVENT_TYPES) {
      const p = buildPayload(event);
      expect(p.eventType).toBe(event);
      expect(p.eventData).toBeTruthy();
    }
  });

  it("applies overrides to eventData", () => {
    const p = buildPayload("SUCCESSFUL_TRANSACTION", {
      overrides: { paymentMethod: "CARD" },
    });
    expect((p.eventData as Record<string, unknown>).paymentMethod).toBe("CARD");
  });
});
