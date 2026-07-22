import { Command } from "commander";
import { createServer, type ServerResponse } from "node:http";
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

/** Open a URL in the user's default browser (best-effort, non-fatal). */
function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    /* user can open the URL manually */
  }
}

/** The live inspector single-page app, served by `listen --inspect`. */
function inspectorHtml(port: number): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Monnify Webhook Inspector</title>
<style>
  :root{
    --bg:#0A0F1E; --panel:#111A2E; --panel2:#0E1626; --line:rgba(255,255,255,.07);
    --ink:#EAF0FB; --mut:#8B99B4; --blue:#2F6BFF; --green:#17C964; --amber:#F5A524; --red:#F31260;
  }
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;color:var(--ink);
    background:radial-gradient(1200px 600px at 82% -12%, rgba(47,107,255,.18), transparent 60%), var(--bg);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif}
  .wrap{max-width:960px;margin:0 auto;padding:30px 22px 70px}
  header.top{display:flex;align-items:flex-start;gap:14px;margin-bottom:24px}
  .brand{font-size:21px;font-weight:800;letter-spacing:-.3px}
  .brand b{color:var(--blue)}
  .sub-title{color:var(--mut);font-size:13px;margin-top:3px}
  .sub-title code{color:#8FB2FF;font-family:ui-monospace,Menlo,monospace}
  .live{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--mut);
    background:var(--panel);border:1px solid var(--line);padding:8px 13px;border-radius:999px;letter-spacing:.5px}
  #dot{width:9px;height:9px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
  #dot.flash{animation:flash .6s}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(23,201,100,.5)}70%{box-shadow:0 0 0 8px rgba(23,201,100,0)}100%{box-shadow:0 0 0 0 rgba(23,201,100,0)}}
  @keyframes flash{0%{transform:scale(1)}50%{transform:scale(2);background:var(--blue)}100%{transform:scale(1)}}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:26px}
  .stat{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:16px;padding:16px 18px}
  .stat .n{font-size:30px;font-weight:800;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
  .stat .l{color:var(--mut);font-size:11px;margin-top:5px;text-transform:uppercase;letter-spacing:.7px}
  #stream{display:flex;flex-direction:column;gap:14px}
  .card{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--blue);border-radius:14px;
    padding:14px 16px;animation:slidein .38s cubic-bezier(.2,.75,.2,1)}
  .card.ok{border-left-color:var(--green)} .card.bad{border-left-color:var(--red)} .card.warn{border-left-color:var(--amber)}
  @keyframes slidein{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
  .card header{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .dotk{width:8px;height:8px;border-radius:50%;background:var(--blue);flex:none}
  .card.ok .dotk{background:var(--green)} .card.bad .dotk{background:var(--red)} .card.warn .dotk{background:var(--amber)}
  .type{font-weight:700;font-size:15px}
  .grow{flex:1}
  time{color:var(--mut);font-size:12px;font-variant-numeric:tabular-nums}
  .pill{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;border:1px solid var(--line)}
  .pill.ok{color:var(--green);background:rgba(23,201,100,.10)}
  .pill.bad{color:var(--red);background:rgba(243,18,96,.12)}
  .pill.warn{color:var(--amber);background:rgba(245,165,36,.12)}
  .sub{display:flex;gap:16px;margin:9px 0 2px;color:var(--mut);font-size:13px;flex-wrap:wrap}
  .amt{color:var(--ink);font-weight:700}
  .ref{font-family:ui-monospace,Menlo,monospace;font-size:12px}
  pre.json{margin:11px 0 0;background:#0A1120;border:1px solid var(--line);border-radius:10px;padding:12px 14px;
    overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.55;color:#C7D3EA}
  .jk{color:#6EA8FF} .js{color:#7EE0A6} .jn{color:#F5A524} .jb{color:#F58FB0}
  #empty{text-align:center;color:var(--mut);padding:56px 22px;border:1px dashed var(--line);border-radius:16px;background:var(--panel2)}
  #empty .big{font-size:17px;color:var(--ink);font-weight:600;margin-bottom:10px}
  #empty code{display:inline-block;margin-top:8px;background:#0A1120;border:1px solid var(--line);border-radius:8px;
    padding:9px 13px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#8FE3B0}
</style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <div>
        <div class="brand"><b>Monnify</b> Webhook Inspector</div>
        <div class="sub-title">live events received by <code>monnify listen</code> on port ${port}</div>
      </div>
      <div class="live"><span id="dot"></span> LIVE</div>
    </header>
    <section class="stats">
      <div class="stat"><div class="n" id="c-count">0</div><div class="l">events received</div></div>
      <div class="stat"><div class="n" id="c-valid">0/0</div><div class="l">signature valid</div></div>
      <div class="stat"><div class="n" id="c-last">&mdash;</div><div class="l">last event</div></div>
    </section>
    <div id="empty">
      <div class="big">Waiting for webhooks&hellip;</div>
      <div>Fire one from another terminal:</div>
      <code>monnify trigger SUCCESSFUL_TRANSACTION --forward-to http://localhost:${port}</code>
    </div>
    <section id="stream"></section>
  </div>
<script>
(function(){
  var es = new EventSource('/__events');
  var list = document.getElementById('stream');
  var empty = document.getElementById('empty');
  var cEl = document.getElementById('c-count');
  var vEl = document.getElementById('c-valid');
  var lEl = document.getElementById('c-last');
  var dot = document.getElementById('dot');
  var count = 0, valid = 0, lastTs = 0;
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function hl(obj){
    var s = esc(JSON.stringify(obj, null, 2));
    s = s.replace(/("[^"]*")(\\s*:)?/g, function(_, str, colon){
      return '<span class="'+(colon?'jk':'js')+'">'+str+'</span>'+(colon||'');
    });
    s = s.replace(/\\b(true|false|null)\\b/g, '<span class="jb">$1</span>');
    s = s.replace(/(:\\s)(-?\\d+(\\.\\d+)?)/g, '$1<span class="jn">$2</span>');
    return s;
  }
  function kind(t){
    if(/FAIL|REVERS|REJECT|DECLIN/i.test(t)) return 'bad';
    if(/PENDING|AUTHOR|PROGRESS/i.test(t)) return 'warn';
    return 'ok';
  }
  es.onmessage = function(e){
    var ev = JSON.parse(e.data);
    count++; if(ev.sigOk) valid++;
    cEl.textContent = count;
    vEl.textContent = valid + '/' + count;
    lastTs = Date.now();
    if(empty) empty.style.display = 'none';
    var card = document.createElement('article');
    card.className = 'card ' + kind(ev.eventType);
    var sig = ev.sigOk ? '<span class="pill ok">signature valid</span>' : '<span class="pill bad">signature invalid</span>';
    var fwd = ev.forwarded ? '<span class="pill '+(ev.forwarded.ok?'ok':'warn')+'">forwarded '+(ev.forwarded.status||'x')+'</span>' : '';
    var amt = (ev.amount!=null && ev.amount!=='') ? '<span class="amt">NGN '+Number(ev.amount).toLocaleString()+'</span>' : '';
    var ref = ev.reference ? '<span class="ref">'+esc(ev.reference)+'</span>' : '';
    card.innerHTML =
      '<header><span class="dotk"></span><span class="type">'+esc(ev.eventType)+'</span>'
      + sig + fwd + '<span class="grow"></span><time>'+new Date(ev.ts).toLocaleTimeString()+'</time></header>'
      + '<div class="sub">'+ref+amt+'</div>'
      + '<pre class="json">'+hl(ev.payload)+'</pre>';
    list.insertBefore(card, list.firstChild);
    dot.classList.remove('flash'); void dot.offsetWidth; dot.classList.add('flash');
  };
  setInterval(function(){
    if(!lastTs){ lEl.textContent = '\\u2014'; return; }
    var s = Math.round((Date.now()-lastTs)/1000);
    lEl.textContent = s<2 ? 'just now' : (s<60 ? s+'s ago' : Math.round(s/60)+'m ago');
  }, 1000);
})();
</script>
</body>
</html>`;
}

export const listenCommand = new Command("listen")
  .description("Run a local webhook receiver: print, verify, store, and forward events")
  .option("--port <n>", "Port to listen on", "4400")
  .option("--forward-to <url>", "Forward received events to your app's handler")
  .option("--tunnel", "Expose this receiver publicly so real Monnify sandbox webhooks can reach it")
  .option("--verbose", "Print the full payload of each received event")
  .option("--inspect", "Open a live web inspector in your browser that lights up as events arrive")
  .action(async (opts: { port: string; forwardTo?: string; tunnel?: boolean; verbose?: boolean; inspect?: boolean }) => {
    const config = loadConfig();
    const port = parseInt(opts.port, 10);

    const sseClients = new Set<ServerResponse>();
    const broadcast = (obj: unknown) => {
      const line = `data: ${JSON.stringify(obj)}\n\n`;
      for (const client of sseClients) client.write(line);
    };

    const server = createServer((req, res) => {
      // Live inspector routes (GET only; webhooks are POST, so no collision)
      if (opts.inspect && req.method === "GET") {
        if (req.url === "/" || req.url === "/inspect") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(inspectorHtml(port));
          return;
        }
        if (req.url === "/__events") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          res.write(": connected\n\n");
          sseClients.add(res);
          req.on("close", () => sseClients.delete(res));
          return;
        }
        res.writeHead(204).end(); // favicon etc. — never treat a GET as a webhook
        return;
      }

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

        let forwarded: { status: number; ok: boolean } | null = null;
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
            forwarded = { status: fwd.status, ok: fwd.ok };
            const badge = fwd.ok ? pc.green(`→ ${fwd.status}`) : pc.yellow(`→ ${fwd.status}`);
            console.log(`  ${badge} forwarded to ${opts.forwardTo}`);
          } catch {
            forwarded = { status: 0, ok: false };
            console.log(pc.red(`  ✗ forward failed — is ${opts.forwardTo} running?`));
          }
        }

        if (opts.inspect) {
          const ed = (payload.eventData ?? {}) as Record<string, unknown>;
          broadcast({
            id: stored.id,
            eventType,
            sigOk,
            ts: Date.now(),
            reference:
              ed.transactionReference ?? ed.paymentReference ?? ed.reference ?? ed.mandateReference ?? null,
            amount: ed.amountPaid ?? ed.amount ?? ed.settlementAmount ?? null,
            forwarded,
            payload,
          });
        }
      });
    });

    server.listen(port, async () => {
      console.log(pc.bold(`Listening on http://localhost:${port}`));
      if (opts.forwardTo) console.log(`Forwarding to ${opts.forwardTo}`);

      if (opts.inspect) {
        const inspectUrl = `http://localhost:${port}/`;
        console.log(`${pc.bold("Live inspector:")} ${pc.cyan(inspectUrl)} ${pc.dim("(opening in your browser)")}`);
        openBrowser(inspectUrl);
      }

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
