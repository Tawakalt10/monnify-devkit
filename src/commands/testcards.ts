import { Command } from "commander";
import Table from "cli-table3";
import pc from "picocolors";

/**
 * Sandbox test cards, from https://developers.monnify.com/docs/test-cards
 */
const TEST_CARDS = [
  {
    label: "No OTP",
    number: "4111 1111 1111 1111",
    expiry: "10/2027",
    cvv: "123",
    pin: "1234",
    otp: null,
    behavior: "Charges successfully without OTP",
  },
  {
    label: "With OTP",
    number: "5060 9959 9424 7093",
    expiry: "12/2027",
    cvv: "123",
    pin: "1234",
    otp: "123456",
    behavior: "Requires OTP to complete",
  },
  {
    label: "3DS",
    number: "4000 0000 0000 0002",
    expiry: "12/2027",
    cvv: "123",
    pin: "1234",
    otp: "123456",
    behavior: "Goes through 3DS verification",
  },
  {
    label: "Failing",
    number: "4111 1111 1111 1110",
    expiry: "10/2027",
    cvv: "123",
    pin: "1234",
    otp: null,
    behavior: "Always fails — test your error path",
  },
];

export const testcardsCommand = new Command("testcards")
  .description("Show Monnify sandbox test cards — no more digging through the docs mid-test")
  .option("--json", "Raw JSON output")
  .action((opts: { json?: boolean }) => {
    if (opts.json) {
      console.log(JSON.stringify(TEST_CARDS, null, 2));
      return;
    }
    const table = new Table({ head: ["Card", "Number", "Expiry", "CVV", "PIN", "OTP", "Behavior"] });
    for (const c of TEST_CARDS) {
      table.push([c.label, c.number, c.expiry, c.cvv, c.pin, c.otp ?? "—", c.behavior]);
    }
    console.log(table.toString());
    console.log(pc.dim("Sandbox only. Source: developers.monnify.com/docs/test-cards"));
  });
