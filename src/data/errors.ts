/**
 * Monnify API error reference, transcribed from
 * https://developers.monnify.com/docs/error-codes (all 12 categories).
 * Fields: category, error (message or code), meaning, action.
 */

export interface ErrorEntry {
  category: string;
  error: string;
  meaning: string;
  action: string;
}

const E = (category: string, error: string, meaning: string, action: string): ErrorEntry => ({
  category,
  error,
  meaning,
  action,
});

const AUTH = "Authentication";
const TXN = "Transaction & Payment";
const INV = "Invoice";
const CRA = "Customer Reserved Account";
const REC = "Recurring Payment";
const DD = "Direct Debit";
const LIM = "Limit Profile";
const SET = "Settlements";
const PAY = "PayCodes";
const DIS = "Disbursements / Transfer";
const VAL = "Account Validation";
const REF = "Refund";

export const ERROR_REFERENCE: ErrorEntry[] = [
  E(AUTH, "Access token expired", "The generated access token has exceeded its 1 hour time limit.", "Regenerate a new access token."),
  E(AUTH, "Cannot convert access token to json", "The access token is malformed or not in the usual format.", "Recheck for missing characters or bad formatting; generate a new access token."),

  E(TXN, "Unknown currency code supplied", "The currencyCode supplied is not a Monnify supported currency.", "Pass a valid currency code supported by Monnify."),
  E(TXN, "Could not find specified contract", "The contractCode is invalid or doesn't belong to the merchant.", "Pass a valid contractCode for the merchant that matches the environment."),
  E(TXN, "Duplicate payment reference", "The payment reference has been used before in this environment.", "Use a unique payment reference for each transaction initialization."),
  E(TXN, "The request could not be completed due to malformed syntax.", "Often a wrong value in the paymentMethods array or badly formatted JSON.", "Check paymentMethods values and that the JSON payload is correctly formatted."),
  E(TXN, "Invalid transaction reference supplied", "The transaction reference is invalid or unrecognized.", "Ensure the transaction reference is valid."),
  E(TXN, "could not find specified bank", "The supplied bank code could not be found.", "Pass a correct, supported bank code (see `monnify banks`)."),
  E(TXN, "Could not find transaction with the specified transaction reference", "The transaction reference might not exist or is wrong.", "Cross-check the supplied reference."),
  E(TXN, "Invalid Card Number", "The card number supplied is wrong.", "Check the card number and try again (see `monnify testcards` for sandbox)."),
  E(TXN, "Merchant has not been configured for bin", "The card's first six digits (BIN) are not supported for this merchant.", "Confirm the card is a supported local card, otherwise contact Monnify support."),
  E(TXN, "Auth Data error", "Frequently caused by wrong expiry year or other card fields.", "Confirm card expiry year and card data are correct."),
  E(TXN, "Payment already exists", "A payment was retried for an already successful or pending payment.", "No action if the original succeeded; otherwise check transaction status."),
  E(TXN, "No Card Payment found for this transaction.", "No card payment was initiated before calling OTP/3DS authorization.", "Initiate a card payment before the OTP or 3DS endpoints."),
  E(TXN, "Transaction Failed", "Attempting to authorize a transaction that already failed.", "No action required."),
  E(TXN, "There's no transaction matching supplied reference. Please confirm the supplied reference and try again.", "The transactionReference doesn't exist or doesn't belong to the merchant.", "Confirm the reference belongs to you and you're on the right environment."),
  E(TXN, "400 Bad Request", "The transactionReference in the URL was not URL-encoded ('|' must become %7C).", "URL-encode the transaction reference."),
  E(TXN, "Could not find transaction with payment reference String for merchant", "The reference passed is not valid for any of the merchant's transactions.", "Cross-check the reference and retry."),

  E(INV, "Invoice with this reference already exists.", "The invoiceReference was already used in a previous invoice.", "Retry with a unique invoiceReference."),
  E(INV, "Unknown Contract Code provided.", "The contractCode is invalid or doesn't belong to the merchant.", "Confirm the contract code and the environment."),
  E(INV, "Amount must be greater than 20.", "Invoice amount must be at least 20 Naira.", "Create invoices of at least ₦20."),
  E(INV, "Invalid bvn provided", "The BVN in the request is not valid.", "Confirm the BVN is valid (11 digits)."),
  E(INV, "Invalid invoice expiry date.", "The expiryDate is before the current date.", "Use an expiry date in the future."),
  E(INV, "Invalid invoice expiry date format", "The expiryDate is not in the expected format.", "Use yyyy-MM-dd HH:mm:ss (space-separated, not ISO 8601)."),

  E(CRA, "You can not reserve two accounts with the same reference.", "The accountReference was already used.", "Fetch the existing reserved account, or use a unique account reference."),
  E(CRA, "Invalid contract code supplied.", "The contractCode is wrong or not the merchant's.", "Confirm the contract code and environment."),
  E(CRA, "BVN is invalid. Must be 11 digits", "The BVN/NIN provided is invalid.", "Ensure the BVN/NIN is valid and 11 digits."),
  E(CRA, "Unknown currency code supplied.", "The currency code is not supported.", "Use a Monnify-supported currency code."),
  E(CRA, "We do not support virtual accounts from banks with code XXX.", "Some bank codes in preferredBanks can't have virtual accounts.", "Use supported bankCodes in the preferredBanks parameter."),
  E(CRA, "Unknown sub account code XXXXXXX.", "A sub account in incomeSplitConfig doesn't belong to the merchant.", "Check the SubAccount section on the Monnify dashboard."),

  E(REC, "Card token has expired.", "The supplied card token has expired.", "Regenerate and supply a valid token."),
  E(REC, "Invalid card token", "The token supplied does not exist.", "Check that the token is correct and valid."),
  E(REC, "Duplicate payment reference", "The payment reference was used before in this environment.", "Use a unique payment reference for each request."),

  E(DD, "Mandate start date cannot be in the past", "The mandate start date is earlier than now.", "Use a start date that is not in the past."),
  E(DD, "Unable to validate account information", "Name validation failed for the account number + bank code.", "Confirm the account number and bank code are correct."),
  E(DD, "Unable to find bank against customerAccountBankCode", "The bank code does not exist on Monnify.", "Reconfirm the bankCode is for a CBN-approved bank."),
  E(DD, "Mandate with provided mandate reference already exist.", "The mandateReference was used before.", "Retry with a unique mandateReference."),

  E(LIM, "Scheme Name Already Exists", "A limit profile with this scheme name already exists.", "Make the scheme name unique."),
  E(LIM, "Invalid daily transaction volume supplied", "A non-integer was passed for dailyTransactionVolume.", "Supply an integer."),
  E(LIM, "must not be negative", "A negative integer was passed into dailyTransactionVolume.", "Supply a positive integer."),
  E(LIM, "Daily transaction Value is less than single transaction value", "Single transaction value exceeds the daily total.", "Keep single transaction value below the daily total."),

  E(SET, "There was an error processing the request, Please try again later...", "Often integer URL parameters were not valid integers.", "Ensure integer fields are valid (e.g. &page=0&size=10)."),
  E(SET, "There's no transaction matching supplied reference. Please confirm supplied reference and try again.", "The transaction reference could not be found for the merchant.", "Ensure the reference is valid and URL-encoded (| → %7C)."),

  E(PAY, "Invalid paycode expiry date", "The expiry date is before the current date.", "Use a future expiry date."),
  E(PAY, "Paycode expiry date is after system limit.", "The expiry date is too far in the future.", "Use a closer expiry date."),
  E(PAY, "Transaction reference already exist.", "The paycode reference was used before.", "Supply a unique paycode reference."),
  E(PAY, "must be greater than or equal to 1", "The amount is below the minimum (1).", "Supply an amount ≥ 1."),
  E(PAY, "Unknown client id XXX", "The client Id doesn't belong to the authenticated merchant.", "Cross-check the client Id and environment."),

  E(DIS, "0", "Request was processed; check transaction status in the response body.", "Check the response body for the transaction status."),
  E(DIS, "99", "An unexpected error occurred while processing the transaction.", "Re-query to ascertain transaction status."),
  E(DIS, "D01", "Something went wrong; the actual error is in the responseMessage field.", "Treat as failed."),
  E(DIS, "D02", "Transaction does not exist.", "Treat as failed."),
  E(DIS, "D03", "Invalid account details supplied.", "Treat as failed."),
  E(DIS, "D04", "Insufficient wallet balance.", "Fund your wallet, then retry."),
  E(DIS, "D05", "Supplied reference already exists.", "Retry with a unique reference."),
  E(DIS, "D06", "Unauthorized request — only whitelisted IPs can initiate transfers.", "Email integration-support@monnify.com to whitelist your server IP."),
  E(DIS, "D07", "Duplicate request — same destination and amount within 2 minutes.", "Retry after 2 minutes, or ask Monnify support to disable the check."),
  E(DIS, "Invalid destination account number", "The account number did not pass name enquiry.", "Provide a valid account number."),
  E(DIS, "Dormant beneficiary account", "The customer's account is dormant.", "Customer should engage their bank."),
  E(DIS, "Beneficiary account name mismatch", "The beneficiary account name doesn't match.", "Reconfirm the supplied account details."),
  E(DIS, "Unknown destination bank code", "The destination bank code does not exist on Monnify.", "Reconfirm destinationBankCode (see `monnify banks`)."),
  E(DIS, "Transaction timed out while waiting for destination bank", "Timeout from the customer's bank.", "Re-query the transaction."),
  E(DIS, "Invalid amount", "The transaction amount is invalid.", "Reconfirm the amount."),
  E(DIS, "Delayed processing from NIP", "Delay from NIP.", "Re-query."),
  E(DIS, "Post No Credit restriction on beneficiary account", "The account has a PND restriction and cannot be credited.", "Customer should engage their bank."),
  E(DIS, "Beneficiary bank not available", "The customer's bank is unavailable.", "Re-query the transaction."),
  E(DIS, "Invalid session ID", "Invalid session ID.", "Re-query the transaction."),
  E(DIS, "Rejected by destination institution", "The credit was rejected by the destination bank.", "Customer should ask their bank for the rejection reason."),
  E(DIS, "Suspected fraud", "The customer's account is under fraud investigation.", "Customer should engage their bank."),
  E(DIS, "Invalid response code from beneficiary Institution", "Unknown response code from the beneficiary bank.", "Re-query the transaction."),
  E(DIS, "System malfunction by destination institution", "System malfunction at the destination institution.", "Re-query the transaction."),
  E(DIS, "Beneficiary account limit exceeded", "The account is low-KYC and has hit its limit.", "Customer should upgrade their account with their bank."),
  E(DIS, "Sender not permitted to credit beneficiary", "The account cannot be credited due to a restriction.", "Customer should ask their bank about the restriction."),
  E(DIS, "Unable to complete the transaction at this time", "Beneficiary bank or provider service is unavailable.", "Re-query the transaction."),
  E(DIS, "Transaction could not be processed at this time. Please try again", "Provider service is currently unavailable.", "Re-query the transaction."),
  E(DIS, "Transaction processing in progress", "The transaction is still processing.", "Re-query the transaction."),
  E(DIS, "Account number could not be validated", "Name enquiry failed — invalid account or bank unavailable.", "Reconfirm destination details and bank availability."),
  E(DIS, "Transaction Failed", "Failed due to a system or provider error.", "Engage Monnify support."),
  E(DIS, "System Malfunction - Internal service failure", "Failed due to an internal error.", "Engage Monnify support."),
  E(DIS, "System Malfunction - Transaction transmission unsuccessful", "Failed due to system malfunction.", "Engage Monnify support."),
  E(DIS, "Processor Malfunction - Transaction transmission failed", "An error in transaction processing with NIBSS.", "Re-query the transaction."),
  E(DIS, "Supplied account number does not belong to merchant", "The source account number is wrong.", "Cross-check with the account number on the wallet page of the Monnify dashboard."),
  E(DIS, "Supplied reference already exists!", "The reference was used in a previous transaction.", "Make every transaction reference unique."),
  E(DIS, "Could not find disbursement transaction for given reference", "The reference is wrong or the disbursement cannot be found.", "Cross-check against the reference used at creation."),

  E(VAL, "0", "Verification was successful.", "Proceed with the validated account details."),
  E(VAL, "99", "Invalid account details supplied.", "Confirm the account number is correct and belongs to the supplied bank."),

  E(REF, "0", "Request received successfully; it will be processed.", "Await processing and check status as needed."),
  E(REF, "99", "Error occurred while processing your request.", "Engage Monnify support."),
  E(REF, "R1", "Transaction with the specified reference does not exist.", "Recheck the transaction reference."),
  E(REF, "R2", "Refund not permitted — only ACCOUNT_TRANSFER payments can be refunded.", "Check the transaction's paymentMethod."),
  E(REF, "R3", "Refund amount is above the transaction amount.", "Recheck the transaction amount."),
  E(REF, "R4", "Refund amount is below the minimum refundable amount.", "Minimum refundable amount is ₦100."),
  E(REF, "R5", "Merchant has insufficient funds to process the refund.", "Top up the Monnify wallet and retry."),
  E(REF, "R6", "Customer account details are invalid or missing.", "Request valid details; include destinationAccountNumber and destinationAccountBankCode when needed."),
  E(REF, "R7", "No refund was initiated with the supplied refund reference.", "Confirm the refund was successfully initiated."),
  E(REF, "R8", "A supplied value exceeded its character limit.", "refundReason ≤ 64 chars; customerNote ≤ 16 chars."),
  E(REF, "R9", "The refund reference already exists for this merchant.", "Use a new, distinct refund reference."),
  E(REF, "R10", "Merchant account balance could not be retrieved.", "Contact Monnify support."),
  E(REF, "R11", "Name inquiry network error.", "Retry later or contact Monnify support."),
  E(REF, "R12", "Total refunds on this transaction already equal the transaction amount.", "No further refunds are possible on this transaction."),
  E(REF, "M01", "System error.", "Contact Monnify support."),
  E(REF, "M02", "System error.", "Contact Monnify support."),
];

export const CATEGORIES = [...new Set(ERROR_REFERENCE.map((e) => e.category))];
