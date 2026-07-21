import { Command } from "commander";
import pc from "picocolors";
import { loadConfig, configPath } from "../config.js";
import { authenticate } from "../api/client.js";
import { mask } from "../ui/prompt.js";

export const whoamiCommand = new Command("whoami")
  .description("Show the stored identity and verify it against the sandbox")
  .option("--no-verify", "Skip the live credential check")
  .action(async (opts: { verify: boolean }) => {
    const config = loadConfig();
    console.log(`${pc.bold("API key:")}       ${mask(config.apiKey)}`);
    console.log(`${pc.bold("Contract code:")} ${config.contractCode}`);
    console.log(`${pc.bold("Environment:")}   sandbox ${pc.dim("(enforced)")}`);
    console.log(pc.dim(`Config: ${configPath}`));
    if (opts.verify) {
      process.stdout.write(pc.dim("Verifying with Monnify... "));
      try {
        await authenticate(config);
        console.log(pc.green("✓ valid"));
      } catch {
        console.log(pc.red("✗ could not verify (bad credentials or no network)"));
        process.exitCode = 1;
      }
    }
  });
