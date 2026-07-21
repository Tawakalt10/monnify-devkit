# Monnify DevKit

[![npm](https://img.shields.io/npm/v/monnify-devkit)](https://www.npmjs.com/package/monnify-devkit)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

> The Stripe-CLI experience for [Monnify](https://monnify.com) — scaffold, test, and debug payment integrations from your terminal. **Sandbox only, by design.**

Built for the APIConf Lagos 2026 × Monnify Developer Challenge.

## Why

Testing a Monnify webhook handler today means: deploy your server or set up a tunnel, complete a real checkout in the browser, wait for the webhook, dig through logs, repeat. And when signature verification fails, nothing tells you why.

This CLI collapses that loop to one command.

## Install

```bash
npm install -g monnify-devkit
```

Or run without installing: `npx monnify-devkit <command>`

## Quickstart

```bash
monnify login     # interactive — secret key is masked, never in shell history
monnify banks     # confirm everything works
```

Fire a correctly-signed fake payment webhook at your local handler — no deploy, no checkout, no waiting:

```bash
monnify trigger SUCCESSFUL_TRANSACTION --forward-to http://localhost:3000/webhooks --amount 5000
```

Don't have a handler yet? Scaffold one with signature verification done right:

```bash
monnify init my-app
cd my-app && npm install
MONNIFY_SECRET_KEY=<your sandbox secret> npm start
```

## Commands

| Command | Purpose |
|---|---|
| `login` / `logout` / `whoami` | Manage sandbox credentials (stored with 600 permissions, verified live) |
| `init [dir]` | Scaffold an Express app with a signature-verifying webhook handler |
| `banks` | List supported banks and codes |
| `tx list` / `tx get <ref>` | Query sandbox transactions |
| `pay <amount>` | Create a real sandbox payment, get the checkout URL |
| `trigger <event> --forward-to <url>` | Send a simulated, correctly-signed webhook to your handler |
| `listen [--forward-to <url>]` | Local receiver: print events, verify signatures, forward |
| `replay [--last N \| --id <id>]` | Re-send stored events — test your idempotency handling |
| `verify <file> [--against <sig>]` | Debug signature mismatches, with likely-cause diagnosis |
| `events` | Show the local event delivery log |

Supported trigger events: `SUCCESSFUL_TRANSACTION`, `FAILED_TRANSACTION`, `SUCCESSFUL_DISBURSEMENT`, `FAILED_DISBURSEMENT`, `SETTLEMENT`. Override any payload field with `--override key=value`.

## How signing works

Monnify signs webhooks with **HMAC-SHA512 over the raw request body bytes**, hex-encoded, in the `monnify-signature` header. The most common integration bug is verifying against a *re-serialized* body instead of the raw bytes — `monnify verify` detects exactly that case and tells you.

Every simulated webhook this tool sends is signed with your own sandbox secret using the same scheme, so your handler's verification code is exercised for real.

## Safety

- Sandbox only: the base URL is hard-coded and `login` rejects non-`MK_TEST_` keys
- Credentials live in `~/.monnify/config.json` (permissions 600), never in the repo or your shell history
- The webhook simulator runs entirely on your machine

## Development

```bash
npm install
npm test            # vitest — signing golden vectors, payload builders
npm run typecheck
npm run dev -- <command>
```

## Roadmap

Tunnel integration for `listen` (receive real sandbox webhooks locally), more event types, refund and direct-debit commands once enabled in sandbox by default.

## Team

Built by [Tawakalt Raheem](https://github.com/Tawakalt10) and Taofiq Aiyelabegan for the APIConf Lagos 2026 Monnify Developer Challenge.

## License

MIT
