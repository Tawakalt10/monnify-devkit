import { Command } from "commander";
import Table from "cli-table3";
import { readEvents } from "../store/events.js";

export const eventsCommand = new Command("events")
  .description("Show the local webhook event log (~/.monnify/events.jsonl)")
  .option("--last <n>", "Show last N events", "15")
  .option("--json", "Raw JSON output")
  .action((opts: { last: string; json?: boolean }) => {
    const events = readEvents().slice(-parseInt(opts.last, 10));
    if (opts.json) {
      console.log(JSON.stringify(events, null, 2));
      return;
    }
    if (events.length === 0) {
      console.log("No events yet. `monnify trigger` or `monnify listen` will populate this.");
      return;
    }
    const table = new Table({ head: ["Id", "Time", "Source", "Event", "Target", "Status"] });
    for (const e of events) {
      table.push([
        e.id,
        e.deliveredAt.slice(11, 19),
        e.source,
        e.eventType,
        e.target,
        e.responseStatus ?? "—",
      ]);
    }
    console.log(table.toString());
  });
