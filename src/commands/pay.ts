import { Command } from "commander";
import { randomUUID } from "node:crypto";
import pc from "picocolors";
import { apiPost } from "../api/client.js";
import { loadConfig } from "../config.js";

interface InitTransactionResponse {
  transactionReference: string;
  paymentReference: string;
  checkoutUrl: string;
}

export const payCommand = new Command("pay")
  .description("Create a real sandbox payment and print the checkout URL")
  .argument("<amount>", "Amount in Naira", parseFloat)
  .option("--email <email>", "Customer email", "devkit@example.com")
  .option("--name <name>", "Customer name", "DevKit Customer")
  .option("--description <desc>", "Payment description", "monnify-devkit test payment")
  .action(async (amount: number, opts: { email: string; name: string; description: string }) => {
    const config = loadConfig();
    const reference = `DEVKIT-${randomUUID().slice(0, 8).toUpperCase()}`;
    const body = {
      amount,
      customerName: opts.name,
      customerEmail: opts.email,
      paymentReference: reference,
      paymentDescription: opts.description,
      currencyCode: "NGN",
      contractCode: config.contractCode,
      paymentMethods: ["ACCOUNT_TRANSFER", "CARD"],
    };
    const res = await apiPost<InitTransactionResponse>(
      "/api/v1/merchant/transactions/init-transaction",
      body
    );
    console.log(`${pc.green("✓")} Payment initialized ${pc.dim(`(ref: ${res.paymentReference})`)}`);
    console.log(`\n${pc.bold("Checkout URL:")}\n${res.checkoutUrl}\n`);
    console.log(pc.dim("Complete this checkout to generate a REAL sandbox webhook (needs `listen` + tunnel)."));
  });
