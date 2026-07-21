import { Command } from "commander";
import pc from "picocolors";
import { buildPayload, EVENT_TYPES, type EventType } from "../webhooks/payloads.js";
import { computeSignature } from "../webhooks/sign.js";
import { appendEvent } from "../store/events.js";
import { loadConfig } from "../config.js";

export const triggerCommand = new Command("trigger")
  .description("Fire a simulated, correctly-signed Monnify webhook at your local handler")
  .argument("<event>", `Event type: ${EVENT_TYPES.join(", ")}`)
  .requiredOption("--forward-to <url>", "Your webhook handler URL, e.g. http://localhost:3000/webhooks")
  .option("--amount <naira>", "Amount in Naira", parseFloat)
  .option("--reference <ref>", "Transaction reference")
  .option("--override <k=v...>", "Override eventData fields", collectOverrides, {})
  .action(async (event: string, opts: {
    forwardTo: string;
    amount?: number;
    reference?: string;
    override: Record<string, unknown>;
  }) => {
    if (!EVENT_TYPES.includes(event as EventType)) {
      throw new Error(`Unknown event "${event}". Valid: ${EVENT_TYPES.join(", ")}`);
    }
    const config = loadConfig();
    const payload = buildPayload(event as EventType, {
      amount: opts.amount,
      reference: opts.reference,
      overrides: opts.override,
    });

    // Serialize ONCE — sign these bytes, send these bytes.
    const rawBody = JSON.stringify(payload);
    const signature = computeSignature(rawBody, config.secretKey);

    const started = Date.now();
    let status: number | undefined;
    try {
      const res = await fetch(opts.forwardTo, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "monnify-signature": signature,
        },
        body: rawBody,
      });
      status = res.status;
    } catch {
      console.log(pc.red(`✗ Could not reach ${opts.forwardTo} — is your server running?`));
      process.exitCode = 1;
    }

    const stored = appendEvent({
      source: "trigger",
      eventType: event,
      target: opts.forwardTo,
      payload,
      responseStatus: status,
    });

    if (status !== undefined) {
      const ok = status >= 200 && status < 300;
      const badge = ok ? pc.green(`✓ ${status}`) : pc.yellow(`⚠ ${status}`);
      console.log(
        `${badge} ${pc.bold(event)} → ${opts.forwardTo} ${pc.dim(`(${Date.now() - started}ms, id: ${stored.id})`)}`
      );
      if (!ok) {
        console.log(pc.dim("  Your handler should return 2xx quickly, then process asynchronously."));
      }
    }
  });

function collectOverrides(value: string, previous: Record<string, unknown>): Record<string, unknown> {
  const idx = value.indexOf("=");
  if (idx === -1) throw new Error(`--override expects k=v, got "${value}"`);
  const key = value.slice(0, idx);
  const raw = value.slice(idx + 1);
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* keep as string */
  }
  return { ...previous, [key]: parsed };
}
