# monnify-devkit

> The Stripe-CLI experience for [Monnify](https://monnify.com) — scaffold, test, and debug payment integrations from your terminal. **Sandbox only, by design.**

Built for the APIConf Lagos 2026 × Monnify Developer Challenge.

## Why

Testing a Monnify webhook handler today means: deploy or tunnel your server, complete a real checkout in the browser, wait for the webhook, tail your logs, repeat. This CLI collapses that loop to one command.

## Quickstart

```bash
npm install
npm run dev -- login    # prompts for keys; secret is masked, never in shell history
npm run dev -- banks
```

Flags (`--api-key`, `--secret-key`, `--contract-code`) are still accepted for CI/scripting.

Fire a correctly-signed fake payment webhook at your local handler:

```bash
npm run dev -- trigger SUCCESSFUL_TRANSACTION --forward-to http://localhost:3000/webhooks --amount 5000
```

## Commands

| Command | Purpose |
|---|---|
| `login` | Interactive auth — masked secret prompt, live verification, sandbox keys only |
| `logout` / `whoami` | Remove or inspect stored credentials |
| `banks` | List supported banks and codes |
| `tx list` / `tx get <ref>` | Query sandbox transactions |
| `pay <amount>` | Create a real sandbox payment, get the checkout URL |
| `trigger <event> --forward-to <url>` | Send a simulated, signed webhook to your handler |
| `listen [--forward-to <url>]` | Local receiver: print, verify signatures, store, forward |
| `replay [--last N \| --id <id>]` | Re-send stored events — test idempotency |
| `verify <file> [--against <sig>]` | Debug signature mismatches, with diagnosis |
| `events` | Show the local event log |

## How signing works

Monnify signs webhooks with **HMAC-SHA512 over the raw request body bytes**, hex-encoded, in the `monnify-signature` header. The #1 integration bug is verifying against a *re-serialized* body instead of the raw bytes — `monnify verify` detects exactly that and tells you.

## Development

```bash
npm test          # vitest — signing golden vectors, payload builders
npm run typecheck
npm run build     # emits dist/, `monnify` bin
```

## Status

Hackathon build. Payload shapes are derived from [Monnify's webhook docs](https://developers.monnify.com/docs/integration-tools/webhooks/); corrections from captured real sandbox events are noted here as found.

Roadmap (deliberately not built yet): tunnel integration for `listen`, `init` scaffolding templates, refund/direct-debit commands (disabled by default in sandbox).

## License

MIT
