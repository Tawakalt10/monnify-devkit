import { Command } from "commander";
import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import pc from "picocolors";
import { verifySignature } from "../webhooks/sign.js";
import { appendEvent } from "../store/events.js";
import { loadConfig } from "../config.js";

/**
 * Start a public tunnel to the local port. Tries cloudflared first (fast,
 * reliable, no signup), falls back to localtunnel via npx (zero-install).
 */
function startTunnel(port: number): Promise<{ url: string; proc: ChildProcess }> {
  const attempt = (
    cmd: string,
    args: string[],
    urlPattern: RegExp
  ): Promise<{ url: string; proc: ChildProcess }> =>
    new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.kill();
          reject(new Error("timeout"));
        }
      }, 30_000);

      const scan = (chunk: Buffer) => {
        const match = chunk.toString("utf8").match(urlPattern);
        if (match && !settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ url: match[0], proc });
        }
      };
      proc.stdout?.on("data", scan);
      proc.stderr?.on("data", scan);
      proc.on("error", (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
      proc.on("exit", (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error(`exited with code ${code}`));
        }
      });
    });

  return attempt(
    "cloudflared",
    ["tunnel", "--url", `http://localhost:${port}`],
    /https:\/\/[a-z0-9-]+\.trycloudflare\.com/
  ).catch(() => {
    console.log(
      pc.yellow(
        "\ncloudflared not found — falling back to localtunnel, which can be unreliable for webhook delivery."
      )
    );
    console.log(pc.dim("For a solid tunnel: brew install cloudflared (mac) or see developers.cloudflare.com/cloudflared\n"));
    return attempt(
      "npx",
      ["-y", "localtunnel", "--port", String(port)],
      /https:\/\/[a-z0-9-]+\.loca\.lt/
    ).catch(() => {
      throw new Error(
        "Could not start a tunnel. Install cloudflared (brew install cloudflared) and retry, or run without --tunnel and use `monnify trigger` for simulated events."
      );
    });
  });
}

export const listenCommand = new Command("listen")
  .description("Run a local webhook receiver: print, verify, store, and forward events")
  .option("--port <n>", "Port to listen on", "4400")
  .option("--forward-to <url>", "Forward received events to your app's handler")
  .option("--tunnel", "Expose this receiver publicly so real Monnify sandbox webhooks can reach it")
  .option("--verbose", "Print the full payload of each received event")
  .action(async (opts: { port: string; forwardTo?: string; tunnel?: boolean; verbose?: boolean }) => {
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
        if (opts.verbose) {
          console.log(pc.dim(JSON.stringify(payload, null, 2)));
        }

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

    server.listen(port, async () => {
      console.log(pc.bold(`Listening on http://localhost:${port}`));
      if (opts.forwardTo) console.log(`Forwarding to ${opts.forwardTo}`);

      if (opts.tunnel) {
        process.stdout.write(pc.dim("Starting tunnel... "));
        try {
          const { url, proc } = await startTunnel(port);
          console.log(pc.green("✓"));
          console.log(`\n${pc.bold("Public URL:")} ${pc.cyan(url)}`);
          console.log(pc.dim("Set this as your webhook URL: Monnify dashboard → Settings → Webhooks,"));
          console.log(pc.dim("then `monnify pay 100` and complete the checkout — the real webhook lands here."));
          const cleanup = () => {
            proc.kill();
            process.exit(0);
          };
          process.on("SIGINT", cleanup);
          process.on("SIGTERM", cleanup);
        } catch (err) {
          console.log(pc.red("✗"));
          console.log(pc.yellow((err as Error).message));
          console.log(pc.dim("Continuing without a tunnel — simulated events via `monnify trigger` still work.\n"));
        }
      } else {
        console.log(pc.dim("Point `monnify trigger --forward-to` here, or add --tunnel for real sandbox webhooks."));
      }
      console.log(pc.dim("Ctrl+C to stop.\n"));
    });
  });
