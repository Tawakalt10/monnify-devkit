import { Command } from "commander";
import pc from "picocolors";
import { apiGet } from "../api/client.js";

interface ValidationResult {
  accountNumber: string;
  accountName: string;
  bankCode: string;
}

export const resolveCommand = new Command("resolve")
  .description("Look up the account name for an account number + bank code")
  .argument("<account-number>", "10-digit NUBAN account number")
  .argument("<bank-code>", "Bank code (see `monnify banks`)")
  .option("--json", "Raw JSON output")
  .action(async (accountNumber: string, bankCode: string, opts: { json?: boolean }) => {
    if (!/^\d{10}$/.test(accountNumber)) {
      throw new Error("Account number must be exactly 10 digits.");
    }
    const result = await apiGet<ValidationResult>(
      `/api/v1/disbursements/account/validate?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`
    );
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`${pc.green("✓")} ${pc.bold(result.accountName)}`);
    console.log(pc.dim(`  ${result.accountNumber} · bank ${result.bankCode}`));
  });
