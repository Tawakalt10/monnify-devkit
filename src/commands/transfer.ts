import { Command } from "commander";
import { randomUUID } from "node:crypto";
import pc from "picocolors";
import { apiGet, apiPost } from "../api/client.js";
import { prompt, isInteractive } from "../ui/prompt.js";

interface TransferResponse {
  amount: number;
  reference: string;
  status: string;
  dateCreated?: string;
  totalFee?: number;
  destinationAccountName?: string;
  destinationBankName?: string;
  destinationAccountNumber?: string;
}

interface ValidationResult {
  accountNumber: string;
  accountName: string;
  bankCode: string;
}

export const transferCommand = new Command("transfer")
  .description("Send a sandbox transfer to a bank account (name-checked, with confirmation)")
  .argument("<amount>", "Amount in Naira", parseFloat)
  .requiredOption("--to <account>", "Destination account number (10 digits)")
  .requiredOption("--bank <code>", "Destination bank code (see `monnify banks`)")
  .requiredOption("--source <account>", "Your wallet account number (Monnify dashboard → wallet page)")
  .option("--narration <text>", "Transfer narration", "monnify-devkit sandbox transfer")
  .option("--yes", "Skip the confirmation prompt")
  .action(async (amount: number, opts: {
    to: string;
    bank: string;
    source: string;
    narration: string;
    yes?: boolean;
  }) => {
    // Name-check the destination first — never send money to an unverified account.
    process.stdout.write(pc.dim("Resolving destination account... "));
    const dest = await apiGet<ValidationResult>(
      `/api/v1/disbursements/account/validate?accountNumber=${encodeURIComponent(opts.to)}&bankCode=${encodeURIComponent(opts.bank)}`
    );
    console.log(pc.green("✓"));
    console.log(`\nSend ${pc.bold(`₦${amount.toLocaleString()}`)} to ${pc.bold(dest.accountName)}`);
    console.log(pc.dim(`  ${dest.accountNumber} · bank ${opts.bank} · narration: "${opts.narration}"`));

    if (!opts.yes) {
      if (!isInteractive()) {
        throw new Error("Non-interactive shell: pass --yes to confirm the transfer.");
      }
      const answer = (await prompt("\nConfirm? (y/N)")).toLowerCase();
      if (answer !== "y" && answer !== "yes") {
        console.log("Cancelled — no money moved.");
        return;
      }
    }

    const reference = `DEVKIT-TRF-${randomUUID().slice(0, 8).toUpperCase()}`;
    const result = await apiPost<TransferResponse>("/api/v2/disbursements/single", {
      amount,
      reference,
      narration: opts.narration,
      destinationBankCode: opts.bank,
      destinationAccountNumber: opts.to,
      destinationAccountName: dest.accountName,
      currency: "NGN",
      sourceAccountNumber: opts.source,
    });

    const badge = result.status === "SUCCESS" ? pc.green(`✓ ${result.status}`) : pc.yellow(`● ${result.status}`);
    console.log(`\n${badge} ${pc.dim(`reference: ${result.reference}`)}`);
    if (result.totalFee !== undefined) console.log(pc.dim(`  fee: ₦${result.totalFee}`));
    if (result.status !== "SUCCESS") {
      console.log(pc.dim(`  Check later: monnify transfer-status ${result.reference}`));
    }
  });

export const transferStatusCommand = new Command("transfer-status")
  .description("Check the status of a transfer by reference")
  .argument("<reference>", "Transfer reference")
  .option("--json", "Raw JSON output")
  .action(async (reference: string, opts: { json?: boolean }) => {
    const result = await apiGet<TransferResponse>(
      `/api/v2/disbursements/single/summary?reference=${encodeURIComponent(reference)}`
    );
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const badge = result.status === "SUCCESS" ? pc.green(result.status) : pc.yellow(result.status);
    console.log(`${pc.bold(result.reference)} — ${badge}`);
    console.log(pc.dim(`  ₦${result.amount?.toLocaleString?.() ?? result.amount} → ${result.destinationAccountName ?? "?"} (${result.destinationBankName ?? "?"})`));
  });

export const balanceCommand = new Command("balance")
  .description("Check your sandbox wallet balance")
  .argument("<wallet-account>", "Wallet account number (Monnify dashboard → wallet page)")
  .option("--json", "Raw JSON output")
  .action(async (walletAccount: string, opts: { json?: boolean }) => {
    const result = await apiGet<{ availableBalance: number; ledgerBalance: number }>(
      `/api/v2/disbursements/wallet-balance?accountNumber=${encodeURIComponent(walletAccount)}`
    );
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`${pc.bold("Available:")} ₦${result.availableBalance?.toLocaleString?.() ?? result.availableBalance}`);
    console.log(`${pc.bold("Ledger:")}    ₦${result.ledgerBalance?.toLocaleString?.() ?? result.ledgerBalance}`);
  });
