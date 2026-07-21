import { Command } from "commander";
import { existsSync, unlinkSync } from "node:fs";
import pc from "picocolors";
import { configPath } from "../config.js";

export const logoutCommand = new Command("logout")
  .description("Remove stored credentials from this machine")
  .action(() => {
    if (!existsSync(configPath)) {
      console.log("Not logged in — nothing to remove.");
      return;
    }
    unlinkSync(configPath);
    console.log(`${pc.green("✓")} Logged out. ${pc.dim(`Removed ${configPath}`)}`);
  });
