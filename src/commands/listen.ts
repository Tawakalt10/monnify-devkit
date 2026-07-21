import { Command } from "commander";
import { createServer } from "node:http";
import pc from "picocolors";
import { verifySignature } from "../webhooks/sign.js";
import { appendEvent } from "../store/events.js";
import { loadConfig } from "../config.js";

export const listenCommand = new Command("listen")
  .description("Run a local webhook receiver: print, verify, store, and forward events")
  .option("--port <n>", "Port to listen on", "4400")
  .option("--forward-to <url>", "Forward received events to your app's handler")
  .action(async (opts: { port: string; forwardTo?: string }) => {
    const config = loadConfig();
    const port = parseInt(opts.port, 10);

    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", async () => {
        const rawBody = Buffer.concat(chunks);
        res.writeHead(200).end(); // ACK fast, like a good webhook handler

        const received = (req.headers["monnify-signature"] as string) ?? "";
        const sigOk = received !== "" && verifySignature(rawBody, config.secretKey, received);

        let payload: Record<string, unknown> = {};
        let eventType = "UNKNOWN";
        try {
          payload = JSON.parse(rawBody.toString("utf8"));
          eventType = (payload.eventType as string) ?? "UNKNOWN";
        } catch {
          console.log(pc.red("✗ Received non-JSON body"));
          return;
        }

        const sigBadge = sigOk ? pc.green("sig ✓") : pc.red("sig ✗");
        const stored = appendEvent({
          source: "listen",
          eventType,
          target: opts.forwardTo ?? `local:${port}`,
          payload,
        });
        console.log(
          `${pc.cyan("←")} ${pc.bold(eventType)} [${sigBadge}] ${pc.dim(`id: ${stored.id}`)}`
        );

        if (opts.forwardTo) {
          try {
            const fwd = await fetch(opts.forwardTo, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "monnify-signature": received,
              },
              body: rawBody,
            });
            const badge = fwd.ok ? pc.green(`→ ${fwd.status}`) : pc.yellow(`→ ${fwd.status}`);
            console.log(`  ${badge} forwarded to ${opts.forwardTo}`);
          } catch {
            console.log(pc.red(`  ✗ forward failed — is ${opts.forwardTo} running?`));
          }
        }
      });
    });

    server.listen(port, () => {
      console.log(pc.bold(`Listening on http://localhost:${port}`));
      if (opts.forwardTo) console.log(`Forwarding to ${opts.forwardTo}`);
      console.log(pc.dim("Point `monnify trigger --forward-to` here, or tunnel this port for real sandbox webhooks."));
      console.log(pc.dim("Ctrl+C to stop.\n"));
    });
  });
