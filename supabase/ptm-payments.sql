-- PTM / Prescribe tu Multa
-- Persistencia de pagos para produccion en Supabase.
-- Ejecutar en Supabase SQL Editor cuando vayas a activar persistencia real.

create table if not exists public.ptm_payments (
  id uuid primary key default gen_random_uuid(),

  request_id text not null unique,
  external_reference text,
  preference_id text,
  payment_id text,

  status text not null default 'created',
  raw_status text,
  status_detail text,

  amount integer default 0,

  customer_email text,
  customer_name text,
  payer_email text,
  plate text,
  product text,
  checkout_url text,

  sandbox boolean default false,
  mock boolean default false,

  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  urls jsonb default '{}'::jsonb,
  mercado_pago jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  events jsonb default '[]'::jsonb
);

create index if not exists idx_ptm_payments_request_id
  on public.ptm_payments (request_id);

create index if not exists idx_ptm_payments_status
  on public.ptm_payments (status);

create index if not exists idx_ptm_payments_payment_id
  on public.ptm_payments (payment_id);

create index if not exists idx_ptm_payments_preference_id
  on public.ptm_payments (preference_id);

create index if not exists idx_ptm_payments_paid_at
  on public.ptm_payments (paid_at desc);

alter table public.analysis_requests
  add column if not exists purchase_status text,
  add column if not exists payment_amount integer,
  add column if not exists payment_paid_at timestamptz,
  add column if not exists payment_id text,
  add column if not exists preference_id text,
  add column if not exists payer_email text;

-- RLS opcional: como el servidor usa service_role, puede operar aunque RLS este activo.
-- Si expones lecturas directas desde cliente, crear politicas especificas. Por ahora NO exponer.
