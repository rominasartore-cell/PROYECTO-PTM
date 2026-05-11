import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing ${name} for supabase admin client.`);
  }

  return value.trim();
}

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

/**
 * Cliente lazy compatible con imports existentes:
 *   import { supabaseAdmin } from "@/lib/supabase-admin";
 *   supabaseAdmin.from("tabla")
 *
 * Importar este archivo ya no crea el cliente.
 * El cliente se crea recien cuando una ruta/API lo usa.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
});
