import { Command } from "commander";
import pc from "picocolors";
import { readEvents, appendEvent } from "../store/events.js";
import { computeSignature } from "../webhooks/sign.js";
import { loadConfig } from "../config.js";

export const replayCommand = new Command("replay")
  .description("Re-send previously delivered webhook events (idempotency testing)")
  .option("--last <n>", "Replay the last N events", "1")
  .option("--id <id>", "Replay a specific event by id (see `monnify events`)")
  .option("--forward-to <url>", "Override the original target URL")
  .action(async (opts: { last: string; id?: string; forwardTo?: string }) => {
    const config = loadConfig();
    const all = readEvents();
    if (all.length === 0) {
      console.log("No stored events yet. Use `monnify trigger` or `monnify listen` first.");
      return;
    }
    const selected = opts.id
      ? all.filter((e) => e.id === opts.id)
      : all.slice(-Math.max(1, parseInt(opts.last, 10)));
    if (selected.length === 0) throw new Error(`No event with id "${opts.id}".`);

    for (const event of selected) {
      const target = opts.forwardTo ?? event.target;
      const rawBody = JSON.stringify(event.payload);
      const signature = computeSignature(rawBody, config.secretKey);
      let status: number | undefined;
      try {
        const res = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/json", "monnify-signature": signature },
          body: rawBody,
        });
        status = res.status;
      } catch {
        console.log(pc.red(`✗ Could not reach ${target}`));
        continue;
      }
      appendEvent({
        source: "replay",
        eventType: event.eventType,
        target,
        payload: event.payload,
        responseStatus: status,
      });
      const badge = status >= 200 && status < 300 ? pc.green(`✓ ${status}`) : pc.yellow(`⚠ ${status}`);
      console.log(`${badge} replayed ${pc.bold(event.eventType)} ${pc.dim(`(original: ${event.id})`)} → ${target}`);
    }
    console.log(pc.dim("Tip: your handler should treat replays as duplicates (same reference)."));
  });
