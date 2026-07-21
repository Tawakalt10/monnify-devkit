import { Command } from "commander";
import { readFileSync } from "node:fs";
import pc from "picocolors";
import { computeSignature, verifySignature, diagnoseMismatch } from "../webhooks/sign.js";
import { loadConfig } from "../config.js";

export const verifyCommand = new Command("verify")
  .description("Compute/check a webhook signature for a payload file — debug 'invalid signature' errors")
  .argument("<payload-file>", "Path to a file containing the raw webhook body")
  .option("--against <signature>", "A received signature to compare with")
  .action((file: string, opts: { against?: string }) => {
    const config = loadConfig();
    const rawBody = readFileSync(file, "utf8").trim();
    const expected = computeSignature(rawBody, config.secretKey);

    console.log(`${pc.bold("Expected signature")} (HMAC-SHA512, hex, over raw bytes):`);
    console.log(expected);

    if (opts.against) {
      if (verifySignature(rawBody, config.secretKey, opts.against)) {
        console.log(pc.green("\n✓ Signatures match."));
      } else {
        console.log(pc.red("\n✗ Signatures do NOT match. Likely causes:"));
        for (const hint of diagnoseMismatch(rawBody, config.secretKey, opts.against)) {
          console.log(`  • ${hint}`);
        }
      }
    }
  });
