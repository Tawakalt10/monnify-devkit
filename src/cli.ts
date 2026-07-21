#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { whoamiCommand } from "./commands/whoami.js";
import { banksCommand } from "./commands/banks.js";
import { triggerCommand } from "./commands/trigger.js";
import { replayCommand } from "./commands/replay.js";
import { verifyCommand } from "./commands/verify.js";
import { txCommand } from "./commands/tx.js";
import { listenCommand } from "./commands/listen.js";
import { eventsCommand } from "./commands/events.js";
import { payCommand } from "./commands/pay.js";

const program = new Command("monnify")
  .description("Developer toolkit for the Monnify payment gateway — sandbox only")
  .version("0.1.0");

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);
program.addCommand(banksCommand);
program.addCommand(txCommand);
program.addCommand(payCommand);
program.addCommand(triggerCommand);
program.addCommand(listenCommand);
program.addCommand(replayCommand);
program.addCommand(verifyCommand);
program.addCommand(eventsCommand);

program.parseAsync().catch((err: Error) => {
  console.error(pc.red(`Error: ${err.message}`));
  process.exit(1);
});
