import { Command } from "commander";
import pc from "picocolors";
import { saveConfig, configPath } from "../config.js";
import { authenticate } from "../api/client.js";
import { prompt, promptSecret, isInteractive, mask } from "../ui/prompt.js";

const KEY_HELP = `Get your sandbox keys at ${pc.underline("https://app.monnify.com")} → Developer → API Keys`;

export const loginCommand = new Command("login")
  .description("Authenticate with your Monnify sandbox credentials (interactive, or via flags for CI)")
  .option("--api-key <key>", "Sandbox API key (MK_TEST_...)")
  .option("--secret-key <secret>", "Sandbox secret key (prefer the interactive prompt)")
  .option("--contract-code <code>", "Contract code")
  .action(async (opts: { apiKey?: string; secretKey?: string; contractCode?: string }) => {
    let { apiKey, secretKey, contractCode } = opts;
    const missing = !apiKey || !secretKey || !contractCode;

    if (missing && !isInteractive()) {
      throw new Error(
        `Non-interactive shell: pass --api-key, --secret-key and --contract-code.\n${KEY_HELP}`
      );
    }

    if (missing) {
      console.log(pc.bold("Log in to Monnify (sandbox)"));
      console.log(pc.dim(`${KEY_HELP}\n`));
    }

    while (!apiKey || !apiKey.startsWith("MK_TEST_")) {
      if (apiKey) {
        console.log(
          pc.yellow(`That key doesn't start with MK_TEST_ — this tool is sandbox-only and never touches production.`)
        );
      }
      apiKey = await prompt("API key");
    }
    if (!secretKey) secretKey = await promptSecret("Secret key");
    if (!contractCode) contractCode = await prompt("Contract code");

    const config = { apiKey, secretKey, contractCode };

    process.stdout.write(pc.dim("\nVerifying with Monnify sandbox... "));
    try {
      await authenticate(config);
    } catch (err) {
      console.log(pc.red("failed"));
      throw err;
    }
    console.log(pc.green("✓"));

    saveConfig(config);
    console.log(`\n${pc.green("✓")} Logged in as ${pc.bold(mask(apiKey))} ${pc.dim(`(contract ${contractCode})`)}`);
    console.log(pc.dim(`  Credentials saved to ${configPath} (600). Run \`monnify logout\` to remove them.`));
  });
