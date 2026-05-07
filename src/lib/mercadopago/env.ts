export type MercadoPagoMode = "sandbox" | "production";

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export function requiredEnv(name: string): string {
  const value = clean(process.env[name]);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = clean(process.env[name]);
  return value || undefined;
}

export function getSiteUrl(): string {
  const configured = optionalEnv("NEXT_PUBLIC_SITE_URL") ?? optionalEnv("SITE_URL");
  const vercelUrl = optionalEnv("VERCEL_URL");
  const value = configured ?? (vercelUrl ? `https://${vercelUrl}` : undefined);

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SITE_URL or VERCEL_URL");
  }

  return value.replace(/\/+$/, "");
}

export function getMercadoPagoMode(): MercadoPagoMode {
  const raw = clean(process.env.MP_MODE).toLowerCase();
  if (!raw || raw === "sandbox" || raw === "test") return "sandbox";
  if (raw === "production" || raw === "prod") return "production";
  throw new Error("MP_MODE must be sandbox or production");
}

export function getMercadoPagoAccessToken(): string {
  const mode = getMercadoPagoMode();
  if (mode === "production") return requiredEnv("MP_ACCESS_TOKEN");
  return optionalEnv("MP_TEST_ACCESS_TOKEN") ?? requiredEnv("MP_ACCESS_TOKEN");
}

export function getWebhookSecret(): string | undefined {
  const secret = optionalEnv("MP_WEBHOOK_SECRET");
  if (getMercadoPagoMode() === "production" && !secret) {
    throw new Error("MP_WEBHOOK_SECRET is required in production");
  }
  return secret;
}

export function getStatementDescriptor(): string | undefined {
  const descriptor = optionalEnv("MP_STATEMENT_DESCRIPTOR");
  if (!descriptor) return undefined;
  return descriptor.replace(/[^A-Z0-9 ]/gi, "").toUpperCase().slice(0, 22);
}
