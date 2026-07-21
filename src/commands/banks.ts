import { Command } from "commander";
import Table from "cli-table3";
import { apiGet } from "../api/client.js";

interface Bank {
  name: string;
  code: string;
  ussdTemplate?: string | null;
}

export const banksCommand = new Command("banks")
  .description("List supported banks and their codes")
  .option("--json", "Raw JSON output")
  .action(async (opts: { json?: boolean }) => {
    const banks = await apiGet<Bank[]>("/api/v1/banks");
    if (opts.json) {
      console.log(JSON.stringify(banks, null, 2));
      return;
    }
    const table = new Table({ head: ["Bank", "Code", "USSD"] });
    for (const b of banks) table.push([b.name, b.code, b.ussdTemplate ?? "—"]);
    console.log(table.toString());
    console.log(`${banks.length} banks`);
  });
