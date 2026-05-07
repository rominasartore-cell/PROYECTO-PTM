import crypto from "node:crypto";

export type WebhookSignatureVerification =
  | { ok: true; manifest: string }
  | { ok: false; reason: string; manifest?: string };

function parseXSignature(value: string): { ts?: string; v1?: string } {
  return value.split(",").reduce<{ ts?: string; v1?: string }>((acc, part) => {
    const [key, rawValue] = part.split("=");
    const trimmedKey = key?.trim();
    const trimmedValue = rawValue?.trim();
    if (trimmedKey === "ts") acc.ts = trimmedValue;
    if (trimmedKey === "v1") acc.v1 = trimmedValue;
    return acc;
  }, {});
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function timestampIsFresh(ts: string, toleranceSeconds: number): boolean {
  const numericTs = Number(ts);
  if (!Number.isFinite(numericTs)) return false;

  const nowMs = Date.now();
  const tsMs = ts.length >= 13 ? numericTs : numericTs * 1000;
  const diffSeconds = Math.abs(nowMs - tsMs) / 1000;
  return diffSeconds <= toleranceSeconds;
}

export function verifyMercadoPagoWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
  toleranceSeconds?: number;
}): WebhookSignatureVerification {
  const { xSignature, xRequestId, dataId, secret, toleranceSeconds = 10 * 60 } = params;

  if (!xSignature) return { ok: false, reason: "Missing x-signature header" };
  if (!xRequestId) return { ok: false, reason: "Missing x-request-id header" };
  if (!secret) return { ok: false, reason: "Missing webhook secret" };

  const { ts, v1 } = parseXSignature(xSignature);
  if (!ts || !v1) return { ok: false, reason: "Invalid x-signature format" };
  if (!timestampIsFresh(ts, toleranceSeconds)) return { ok: false, reason: "Expired webhook timestamp" };

  const manifest = [
    dataId ? `id:${dataId.toLowerCase()};` : "",
    `request-id:${xRequestId};`,
    `ts:${ts};`,
  ].join("");

  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  if (!safeEqualHex(expected, v1)) {
    return { ok: false, reason: "Invalid webhook signature", manifest };
  }

  return { ok: true, manifest };
}
