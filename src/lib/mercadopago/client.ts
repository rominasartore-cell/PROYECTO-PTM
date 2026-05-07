import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { getMercadoPagoAccessToken } from "./env";

let cachedClient: MercadoPagoConfig | null = null;

export function mercadoPagoClient(): MercadoPagoConfig {
  if (!cachedClient) {
    cachedClient = new MercadoPagoConfig({
      accessToken: getMercadoPagoAccessToken(),
      options: { timeout: 10000 },
    });
  }
  return cachedClient;
}

export function mercadoPagoPreferenceClient(): Preference {
  return new Preference(mercadoPagoClient());
}

export function mercadoPagoPaymentClient(): Payment {
  return new Payment(mercadoPagoClient());
}
