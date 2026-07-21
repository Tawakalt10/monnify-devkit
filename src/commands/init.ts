import { Command } from "commander";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import pc from "picocolors";

/**
 * Templates are embedded in-source (not a separate folder) so `monnify init`
 * works from the published npm package, which ships only dist/.
 */

const TEMPLATE_FILES: Record<string, string> = {
  "package.json": `{
  "name": "my-monnify-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.0"
  }
}
`,

  "server.js": `import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

const app = express();
const PORT = process.env.PORT || 3000;

// Your Monnify sandbox secret key. In real projects, load from an env var.
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY || "YOUR_SECRET_KEY";

/**
 * WEBHOOK HANDLER — the part most integrations get wrong.
 *
 * Monnify signs the RAW request body bytes with HMAC-SHA512 (hex) and sends
 * the result in the \`monnify-signature\` header. If you let express.json()
 * parse the body first, the raw bytes are gone and verification breaks.
 * That is why this route uses express.raw().
 */
app.post(
  "/webhooks",
  express.raw({ type: "application/json", limit: "256kb" }),
  (req, res) => {
    const signature = req.headers["monnify-signature"] || "";
    const expected = createHmac("sha512", MONNIFY_SECRET_KEY)
      .update(req.body) // req.body is a Buffer here — the raw bytes
      .digest("hex");

    const valid =
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!valid) {
      console.log("✗ webhook rejected: bad signature");
      return res.status(401).end();
    }

    // ACK fast — Monnify retries on non-2xx. Do real work after responding.
    res.status(200).end();

    const event = JSON.parse(req.body.toString("utf8"));
    console.log(\`✓ \${event.eventType} — reference: \${event.eventData?.transactionReference ?? "n/a"}\`);

    // TODO: handle the event. Remember: webhooks can arrive more than once,
    // so make your processing idempotent (dedupe on transactionReference).
  }
);

app.get("/", (_req, res) => {
  res.send("Monnify webhook starter is running. POST webhooks to /webhooks");
});

app.listen(PORT, () => {
  console.log(\`Listening on http://localhost:\${PORT}\`);
  console.log("Test it: monnify trigger SUCCESSFUL_TRANSACTION --forward-to http://localhost:\${PORT}/webhooks".replace("\${PORT}", PORT));
});
`,

  ".env.example": `# Copy to .env and fill in. Never commit .env.
MONNIFY_SECRET_KEY=your_sandbox_secret_key
PORT=3000
`,

  ".gitignore": `node_modules/
.env
`,

  "README.md": `# My Monnify App

Scaffolded with [\`monnify init\`](https://www.npmjs.com/package/monnify-devkit).

A minimal Express server with a Monnify webhook handler that verifies
signatures correctly (HMAC-SHA512 over the raw body bytes).

## Run

\`\`\`bash
npm install
MONNIFY_SECRET_KEY=your_sandbox_secret npm start
\`\`\`

## Test the webhook handler without a real payment

\`\`\`bash
monnify trigger SUCCESSFUL_TRANSACTION --forward-to http://localhost:3000/webhooks --amount 5000
\`\`\`

You should see \`✓ SUCCESSFUL_TRANSACTION\` in the server logs. Send a bad
signature (edit the payload in transit, or use a wrong secret) and the
handler rejects it with 401.
`,
};

export const initCommand = new Command("init")
  .description("Scaffold a minimal Express app with a signature-verifying Monnify webhook handler")
  .argument("[directory]", "Target directory", "my-monnify-app")
  .action((directory: string) => {
    const target = resolve(process.cwd(), directory);
    if (existsSync(target)) {
      throw new Error(`Directory "${directory}" already exists. Pick a new name or remove it.`);
    }
    mkdirSync(target, { recursive: true });
    for (const [name, contents] of Object.entries(TEMPLATE_FILES)) {
      writeFileSync(join(target, name), contents, "utf8");
    }

    console.log(`${pc.green("✓")} Created ${pc.bold(directory)}/`);
    for (const name of Object.keys(TEMPLATE_FILES)) {
      console.log(pc.dim(`  ${name}`));
    }
    console.log(`\nNext steps:`);
    console.log(`  ${pc.cyan(`cd ${directory}`)}`);
    console.log(`  ${pc.cyan("npm install")}`);
    console.log(`  ${pc.cyan("MONNIFY_SECRET_KEY=<your sandbox secret> npm start")}`);
    console.log(`\nThen fire a test webhook at it:`);
    console.log(`  ${pc.cyan("monnify trigger SUCCESSFUL_TRANSACTION --forward-to http://localhost:3000/webhooks")}`);
  });
