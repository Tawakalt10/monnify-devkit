import { randomUUID } from "node:crypto";

/**
 * Webhook payload builders for every event type Monnify documents:
 * https://developers.monnify.com/docs/webhooks/event-types
 *
 * Shapes mirror the sample payloads in the docs. If a captured real sandbox
 * event ever differs, fix the builder and note it in the README.
 */

export interface TriggerOptions {
  amount?: number;
  reference?: string;
  overrides?: Record<string, unknown>;
}

function nowStamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function slashStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const h12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${h12}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function ref(prefix: string): string {
  return `${prefix}${randomUUID().slice(0, 8).toUpperCase()}`;
}

type Builder = (opts: TriggerOptions) => Record<string, unknown>;

interface CatalogEntry {
  description: string;
  build: Builder;
}

const CATALOG: Record<string, CatalogEntry> = {
  SUCCESSFUL_TRANSACTION: {
    description: "Successful collection (payment received)",
    build: ({ amount = 10_000, reference }) => ({
      eventType: "SUCCESSFUL_TRANSACTION",
      eventData: {
        product: { reference: reference ?? ref("MNFY|DEVKIT|"), type: "RESERVED_ACCOUNT" },
        transactionReference: reference ?? ref("MNFY|DEVKIT|"),
        paymentReference: reference ?? ref("MNFY|DEVKIT|"),
        paidOn: nowStamp(),
        paymentDescription: "DevKit simulated payment",
        metaData: {},
        paymentSourceInformation: [
          {
            bankCode: "",
            amountPaid: amount,
            accountName: "DevKit Customer",
            sessionId: randomUUID().replace(/-/g, "").slice(0, 30),
            accountNumber: "0065432190",
          },
        ],
        destinationAccountInformation: {
          bankCode: "232",
          bankName: "Sterling bank",
          accountNumber: "6000140770",
        },
        amountPaid: amount,
        totalPayable: amount,
        cardDetails: {},
        paymentMethod: "ACCOUNT_TRANSFER",
        currency: "NGN",
        settlementAmount: String((amount * 0.99).toFixed(2)),
        paymentStatus: "PAID",
        customer: { name: "DevKit Customer", email: "devkit@example.com" },
      },
    }),
  },

  FAILED_TRANSACTION: {
    description: "Failed collection attempt",
    build: ({ amount = 10_000, reference }) => ({
      eventType: "FAILED_TRANSACTION",
      eventData: {
        transactionReference: reference ?? ref("MNFY|DEVKIT|"),
        paymentReference: reference ?? ref("MNFY|DEVKIT|"),
        paidOn: nowStamp(),
        amountPaid: 0,
        totalPayable: amount,
        paymentMethod: "CARD",
        currency: "NGN",
        paymentStatus: "FAILED",
        customer: { name: "DevKit Customer", email: "devkit@example.com" },
      },
    }),
  },

  OFFLINE_PAYMENT: {
    description: "Offline/cash payment via agent (eventType SUCCESSFUL_TRANSACTION, method CASH)",
    build: ({ amount = 15_000, reference }) => ({
      eventType: "SUCCESSFUL_TRANSACTION",
      eventData: {
        product: { reference: reference ?? ref("MNF-DEVKIT"), type: "OFFLINE_PAYMENT_AGENT" },
        transactionReference: reference ?? ref("MNFY|76|DEVKIT|"),
        invoiceReference: ref("MNF-DEVKIT"),
        paymentReference: reference ?? ref("MNF-DEVKIT"),
        paidOn: slashStamp(),
        paymentDescription: "DevKit offline payment",
        metaData: { phoneNumber: "08088523241", name: "DevKit" },
        destinationAccountInformation: {},
        paymentSourceInformation: {},
        amountPaid: amount,
        totalPayable: amount,
        offlineProductInformation: { amount, code: "56417", type: "INVOICE" },
        cardDetails: {},
        paymentMethod: "CASH",
        currency: "NGN",
        settlementAmount: amount - 10,
        paymentStatus: "PAID",
        customer: { name: "DevKit Customer", email: "devkit@example.com" },
      },
    }),
  },

  REJECTED_PAYMENT: {
    description: "Rejected payment (e.g. underpayment to a reserved account)",
    build: ({ amount = 10_000, reference }) => ({
      eventType: "REJECTED_PAYMENT",
      eventData: {
        metaData: {},
        product: { reference: reference ?? ref("MNFY|PAYREF|DEVKIT|"), type: "WEB_SDK" },
        amount,
        paymentSourceInformation: {
          bankCode: "50515",
          amountPaid: Math.floor(amount * 0.4),
          accountName: "DevKit Customer",
          sessionId: randomUUID().replace(/-/g, "").slice(0, 30),
          accountNumber: "5141901487",
        },
        transactionReference: reference ?? ref("MNFY|85|DEVKIT|"),
        created_on: nowStamp(),
        paymentReference: reference ?? ref("MNFY|PAYREF|DEVKIT|"),
        paymentRejectionInformation: {
          bankCode: "035",
          destinationAccountNumber: "7023576853",
          bankName: "Wema bank",
          rejectionReason: "UNDER_PAYMENT",
          expectedAmount: amount,
        },
        paymentDescription: "DevKit rejected payment",
        customer: { name: "DevKit Customer", email: "devkit@example.com" },
      },
    }),
  },

  SUCCESSFUL_DISBURSEMENT: {
    description: "Successful transfer/payout",
    build: ({ amount = 10_000, reference }) => ({
      eventType: "SUCCESSFUL_DISBURSEMENT",
      eventData: {
        amount,
        transactionReference: reference ?? ref("MFDS"),
        fee: 35,
        transactionDescription: "Approved or completed successfully",
        destinationAccountNumber: "0068687503",
        sessionId: randomUUID().replace(/-/g, "").slice(0, 30),
        createdOn: slashStamp(),
        destinationAccountName: "DevKit Beneficiary",
        reference: ref("ref"),
        destinationBankCode: "232",
        completedOn: slashStamp(),
        narration: "DevKit simulated transfer",
        currency: "NGN",
        destinationBankName: "Sterling bank",
        status: "SUCCESS",
      },
    }),
  },

  FAILED_DISBURSEMENT: {
    description: "Failed transfer/payout",
    build: ({ amount = 10_000, reference }) => ({
      eventType: "FAILED_DISBURSEMENT",
      eventData: {
        amount,
        transactionReference: reference ?? ref("MFDS"),
        fee: 20,
        transactionDescription:
          "You do not have sufficient balance to process this request. Please fund your account and try again.",
        destinationAccountNumber: "8088524531",
        sessionId: "",
        createdOn: slashStamp(),
        destinationAccountName: "DevKit Beneficiary",
        reference: ref("MF"),
        destinationBankCode: "305",
        completedOn: slashStamp(),
        narration: "DevKit simulated transfer",
        currency: "NGN",
        destinationBankName: "OPAY",
        status: "FAILED",
      },
    }),
  },

  REVERSED_DISBURSEMENT: {
    description: "Reversed transfer/payout (money came back)",
    build: ({ amount = 10_000, reference }) => ({
      eventType: "REVERSED_DISBURSEMENT",
      eventData: {
        transactionReference: reference ?? ref("MFDS"),
        reference: ref("ref"),
        narration: "Fund Transfer",
        currency: "NGN",
        amount,
        status: "REVERSED",
        fee: 8,
        destinationAccountNumber: "8088523251",
        destinationAccountName: "DevKit Beneficiary",
        destinationBankCode: "305",
        sessionId: randomUUID().replace(/-/g, "").slice(0, 30),
        createdOn: slashStamp(),
        completedOn: slashStamp(),
      },
    }),
  },

  SUCCESSFUL_REFUND: {
    description: "Refund completed",
    build: ({ amount = 10_000, reference }) => ({
      eventType: "SUCCESSFUL_REFUND",
      eventData: {
        merchantReason: "defective goods",
        transactionReference: reference ?? ref("MNFY|DEVKIT|"),
        completedOn: slashStamp(),
        refundStatus: "COMPLETED",
        customerNote: "defects",
        createdOn: slashStamp(),
        refundReference: ref("ref"),
        refundAmount: amount,
      },
    }),
  },

  FAILED_REFUND: {
    description: "Refund failed",
    build: ({ amount = 10_000, reference }) => ({
      eventType: "FAILED_REFUND",
      eventData: {
        merchantReason: "defective goods",
        transactionReference: reference ?? ref("MNFY|DEVKIT|"),
        completedOn: slashStamp(),
        refundStatus: "FAILED",
        customerNote: "defects",
        createdOn: slashStamp(),
        refundReference: ref("ref"),
        refundAmount: amount,
      },
    }),
  },

  SETTLEMENT: {
    description: "Settlement completed to your bank account or wallet",
    build: ({ amount = 10_000, reference }) => {
      const txRef = reference ?? ref("MNFY|26|DEVKIT|");
      return {
        eventType: "SETTLEMENT",
        eventData: {
          amount: String(amount.toFixed(2)),
          settlementTime: slashStamp(),
          settlementReference: ref("LB"),
          destinationAccountNumber: "6000000249",
          destinationBankName: "Fidelity Bank",
          destinationAccountName: "DevKit Merchant",
          transactionsCount: 1,
          transactions: [
            {
              product: { reference: txRef, type: "WEB_SDK" },
              transactionReference: txRef,
              paymentReference: txRef,
              paidOn: slashStamp(),
              paymentDescription: "DevKit settlement",
              accountPayments: [
                {
                  bankCode: "000014",
                  amountPaid: String(amount.toFixed(2)),
                  accountName: "DevKit Customer",
                  accountNumber: "******1070",
                },
              ],
              amountPaid: String(amount.toFixed(2)),
              totalPayable: String(amount.toFixed(2)),
              accountDetails: {
                bankCode: "000014",
                amountPaid: String(amount.toFixed(2)),
                accountName: "DevKit Customer",
                accountNumber: "******1070",
              },
              cardDetails: {},
              paymentMethod: "ACCOUNT_TRANSFER",
              currency: "NGN",
              paymentStatus: "PAID",
              customer: { name: "DevKit Customer", email: "devkit@example.com" },
            },
          ],
        },
      };
    },
  },

  MANDATE_UPDATE: {
    description: "Direct debit mandate status change",
    build: ({ amount = 100_000, reference }) => ({
      eventType: "MANDATE_UPDATE",
      eventData: {
        customerAddress: "1 DevKit Street, Lagos",
        endDate: "2027-12-31 08:00:00.0",
        customerEmailAddress: "devkit@example.com",
        customerAccountName: "DEVKIT CUSTOMER",
        customerAccountNumber: "2191406799",
        customerAccountBankCode: "057",
        customerName: "DevKit Customer",
        mandateDescription: "DevKit test mandate",
        externalMandateReference: reference ?? ref("mfy-mandate-"),
        mandateStatus: "CANCELLED",
        mandateAmount: amount,
        autoRenew: false,
        mandateCode: `MTDD|${randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase()}`,
        contractCode: "626689863141",
        customerPhoneNumber: "08166189142",
        startDate: nowStamp() + ".0",
      },
    }),
  },

  ACCOUNT_ACTIVITY: {
    description: "Wallet activity (credit/debit on your Monnify wallet)",
    build: ({ amount = 100, reference }) => ({
      eventType: "ACCOUNT_ACTIVITY",
      eventData: {
        accountType: "MAIN",
        accountName: "DevKit Wallet",
        accountNumber: "8016472829",
        accountNuban: null,
        activityType: "TRANSACTION",
        amount,
        currency: "566",
        balanceBefore: 862.68,
        balanceAfter: 862.68 + amount,
        reference: reference ?? ref("MFY_WTP_TRF_DEVKIT_"),
        narration: "DevKit simulated wallet credit",
        activityTime: nowStamp(),
      },
      metaData: {
        senderAccount: "Monnify Service",
        sourceAccountName: null,
        sourceAccountNumber: null,
        sourceBankCode: null,
        sourceBankName: null,
      },
    }),
  },

  LOW_BALANCE_ALERT: {
    description: "Wallet balance dropped below configured threshold",
    build: ({ amount = 2_000 }) => ({
      eventType: "LOW_BALANCE_ALERT",
      eventData: {
        transactionTime: new Date().toISOString().slice(0, 19) + "Z",
        merchantCode: "99ZYAFM0F3CY",
        walletAccountNumber: "8023759978",
        walletBalance: 0,
        lowBalanceThreshold: amount,
        currency: "NGN",
        description:
          "Your wallet balance has dropped below the configured threshold. Please fund your account.",
      },
    }),
  },
};

export type EventType = keyof typeof CATALOG;

export const EVENT_TYPES = Object.keys(CATALOG) as EventType[];

export function describeEvents(): Array<{ name: string; description: string }> {
  return EVENT_TYPES.map((name) => ({ name, description: CATALOG[name].description }));
}

export function buildPayload(event: string, opts: TriggerOptions = {}): Record<string, unknown> {
  const entry = CATALOG[event as EventType];
  if (!entry) {
    throw new Error(`Unknown event type: ${event}. Run \`monnify trigger --list\` to see all ${EVENT_TYPES.length}.`);
  }
  const payload = entry.build(opts);
  if (opts.overrides && Object.keys(opts.overrides).length > 0) {
    const eventData = payload.eventData as Record<string, unknown>;
    Object.assign(eventData, opts.overrides);
  }
  return payload;
}
