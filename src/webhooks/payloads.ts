import { randomUUID } from "node:crypto";

export type EventType =
  | "SUCCESSFUL_TRANSACTION"
  | "FAILED_TRANSACTION"
  | "SUCCESSFUL_DISBURSEMENT"
  | "FAILED_DISBURSEMENT"
  | "SETTLEMENT";

export interface TriggerOptions {
  amount?: number;
  reference?: string;
  overrides?: Record<string, unknown>;
}

function nowStamp(): string {
  // Monnify uses "YYYY-MM-DD HH:mm:ss" style timestamps in webhook payloads
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Payload shapes derived from Monnify's documented webhook event structures:
 * https://developers.monnify.com/docs/integration-tools/webhooks/
 * If you capture a real sandbox webhook that differs, fix the builder and
 * note the correction in the README.
 */
export function buildPayload(event: EventType, opts: TriggerOptions = {}): Record<string, unknown> {
  const amount = opts.amount ?? 10_000;
  const reference = opts.reference ?? `MNFY|DEVKIT|${randomUUID().slice(0, 8).toUpperCase()}`;

  const base: Record<string, Record<string, unknown>> = {
    SUCCESSFUL_TRANSACTION: {
      eventType: "SUCCESSFUL_TRANSACTION",
      eventData: {
        product: { reference, type: "WEB_SDK" },
        transactionReference: reference,
        paymentReference: reference,
        paidOn: nowStamp(),
        paymentDescription: "DevKit simulated payment",
        metaData: {},
        paymentSourceInformation: [],
        destinationAccountInformation: {},
        amountPaid: amount,
        totalPayable: amount,
        cardDetails: {},
        paymentMethod: "ACCOUNT_TRANSFER",
        currency: "NGN",
        settlementAmount: amount,
        paymentStatus: "PAID",
        customer: { name: "DevKit Customer", email: "devkit@example.com" },
      },
    },
    FAILED_TRANSACTION: {
      eventType: "FAILED_TRANSACTION",
      eventData: {
        transactionReference: reference,
        paymentReference: reference,
        paidOn: nowStamp(),
        amountPaid: 0,
        totalPayable: amount,
        paymentMethod: "CARD",
        currency: "NGN",
        paymentStatus: "FAILED",
        customer: { name: "DevKit Customer", email: "devkit@example.com" },
      },
    },
    SUCCESSFUL_DISBURSEMENT: {
      eventType: "SUCCESSFUL_DISBURSEMENT",
      eventData: {
        amount,
        transactionReference: reference,
        fee: 35,
        transactionDescription: "DevKit simulated transfer",
        destinationAccountNumber: "0068687503",
        sessionId: randomUUID(),
        createdOn: nowStamp(),
        destinationAccountName: "DevKit Beneficiary",
        destinationBankCode: "232",
        completedOn: nowStamp(),
        narration: "DevKit simulated transfer",
        currency: "NGN",
        destinationBankName: "Sterling Bank",
        status: "SUCCESS",
      },
    },
    FAILED_DISBURSEMENT: {
      eventType: "FAILED_DISBURSEMENT",
      eventData: {
        amount,
        transactionReference: reference,
        transactionDescription: "DevKit simulated transfer",
        createdOn: nowStamp(),
        currency: "NGN",
        status: "FAILED",
      },
    },
    SETTLEMENT: {
      eventType: "SETTLEMENT",
      eventData: {
        amount: String(amount),
        settlementTime: nowStamp(),
        settlementReference: reference,
        destinationAccountNumber: "0068687503",
        destinationBankName: "Sterling Bank",
        destinationAccountName: "DevKit Merchant",
        transactionsCount: 1,
        transactions: [{ transactionReference: reference }],
      },
    },
  };

  const payload = base[event];
  if (!payload) throw new Error(`Unknown event type: ${event}`);
  if (opts.overrides) {
    const eventData = payload.eventData as Record<string, unknown>;
    Object.assign(eventData, opts.overrides);
  }
  return payload;
}

export const EVENT_TYPES = Object.keys({
  SUCCESSFUL_TRANSACTION: 1,
  FAILED_TRANSACTION: 1,
  SUCCESSFUL_DISBURSEMENT: 1,
  FAILED_DISBURSEMENT: 1,
  SETTLEMENT: 1,
}) as EventType[];
