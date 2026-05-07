import crypto from "node:crypto";
import { requiredEnv } from "./env";

export type CheckoutQuotePayload = {
  version: 1;
  quoteId: string;
  amountClp: number;
  title: string;
  payerEmail: string;
  payerName?: string;
  licensePlate?: string;
  analysisId?: string;
  totalFines?: number;
  prescribedFines?: number;
  expiresAt: number;
};

type CreateCheckoutQuoteInput = Omit<CheckoutQuotePayload, "version" | "expiresAt"> & {
  expiresInSeconds?: number;
};

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payloadBase64: string): string {
  return crypto
    .createHmac("sha256", requiredEnv("MP_QUOTE_SECRET"))
    .update(payloadBase64)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function assertValidPayload(payload: CheckoutQuotePayload): void {
  if (payload.version !== 1) throw new Error("Invalid quote version");
  if (!payload.quoteId || payload.quoteId.length < 8) throw new Error("Invalid quote id");
  if (!Number.isInteger(payload.amountClp) || payload.amountClp <= 0) {
    throw new Error("Invalid quote amount");
  }
  if (!payload.title || payload.title.length > 120) throw new Error("Invalid quote title");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.payerEmail)) {
    throw new Error("Invalid payer email");
  }
  if (!Number.isFinite(payload.expiresAt) || Date.now() > payload.expiresAt) {
    throw new Error("Quote expired");
  }
}

export function createCheckoutQuoteToken(input: CreateCheckoutQuoteInput): string {
  const payload: CheckoutQuotePayload = {
    version: 1,
    quoteId: input.quoteId,
    amountClp: input.amountClp,
    title: input.title,
    payerEmail: input.payerEmail,
    payerName: input.payerName,
    licensePlate: input.licensePlate,
    analysisId: input.analysisId,
    totalFines: input.totalFines,
    prescribedFines: input.prescribedFines,
    expiresAt: Date.now() + (input.expiresInSeconds ?? 30 * 60) * 1000,
  };

  assertValidPayload(payload);

  const payloadBase64 = base64url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function verifyCheckoutQuoteToken(token: string): CheckoutQuotePayload {
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) throw new Error("Invalid quote token");

  const expectedSignature = signPayload(payloadBase64);
  if (!safeEqual(signature, expectedSignature)) throw new Error("Invalid quote signature");

  const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8")) as CheckoutQuotePayload;
  assertValidPayload(payload);
  return payload;
}
