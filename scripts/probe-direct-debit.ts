/**
 * One-off probe: does the sandbox accept direct-debit mandate creation?
 * Run: npx tsx scripts/probe-direct-debit.ts
 * Prints the raw sandbox response either way. Delete after use, or keep as a dev tool.
 */
import { authenticate, BASE_URL } from "../src/api/client.js";
import { loadConfig } from "../src/config.js";

const config = loadConfig();
const token = await authenticate(config);

const now = new Date();
const start = new Date(now.getTime() + 24 * 3600 * 1000); // tomorrow (start date must not be in the past)
const end = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
const fmt = (d: Date) => d.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS

const payload = {
  contractCode: config.contractCode,
  mandateReference: `DEVKIT-MND-${Date.now()}`,
  mandateAmount: 5000,
  autoRenew: false,
  customerCancellation: true,
  customerName: "DevKit Probe",
  customerPhoneNumber: "08012345678",
  customerEmailAddress: "devkit@example.com",
  customerAddress: "1 Probe Street, Lagos",
  customerAccountNumber: "0051762787",
  customerAccountBankCode: "044",
  mandateDescription: "DevKit sandbox probe",
  mandateStartDate: fmt(start),
  mandateEndDate: fmt(end),
  redirectUrl: "https://example.com/direct-debit/success",
  debitAmount: null,
};

console.log(`POST ${BASE_URL}/api/v1/direct-debit/mandate/create\n`);
const res = await fetch(`${BASE_URL}/api/v1/direct-debit/mandate/create`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

console.log(`HTTP ${res.status}`);
console.log(JSON.stringify(await res.json(), null, 2));
