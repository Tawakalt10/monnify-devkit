import { Command } from "commander";
import Table from "cli-table3";
import { apiGet } from "../api/client.js";

interface TxSummary {
  transactionReference: string;
  paymentReference: string;
  amount: number;
  currencyCode: string;
  paymentStatus: string;
  paymentMethod: string;
  createdOn: string;
  customerDTO?: { email?: string };
}

interface TxPage {
  content: TxSummary[];
  totalElements: number;
}

export const txCommand = new Command("tx").description("Query sandbox transactions");

txCommand
  .command("list")
  .description("List recent transactions")
  .option("--page <n>", "Page number", "0")
  .option("--size <n>", "Page size", "10")
  .option("--json", "Raw JSON output")
  .action(async (opts: { page: string; size: string; json?: boolean }) => {
    const page = await apiGet<TxPage>(
      `/api/v1/transactions/search?page=${opts.page}&size=${opts.size}`
    );
    if (opts.json) {
      console.log(JSON.stringify(page, null, 2));
      return;
    }
    const table = new Table({ head: ["Reference", "Amount", "Status", "Method", "Created"] });
    for (const t of page.content ?? []) {
      table.push([
        t.transactionReference,
        `${t.currencyCode} ${t.amount}`,
        t.paymentStatus,
        t.paymentMethod,
        t.createdOn,
      ]);
    }
    console.log(table.toString());
    console.log(`${page.totalElements} total`);
  });

txCommand
  .command("get <reference>")
  .description("Get a transaction's status by reference")
  .option("--json", "Raw JSON output")
  .action(async (reference: string, opts: { json?: boolean }) => {
    const tx = await apiGet<Record<string, unknown>>(
      `/api/v2/transactions/${encodeURIComponent(reference)}`
    );
    console.log(JSON.stringify(tx, null, opts.json ? 2 : 2));
  });
