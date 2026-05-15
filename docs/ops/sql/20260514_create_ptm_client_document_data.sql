create table if not exists public.ptm_client_document_data (
  request_id text primary key,
  customer_email text,
  rut_solicitante text not null,
  profesion_oficio text not null,
  domicilio_solicitante text not null,
  comuna_solicitante text not null,
  consent_accepted boolean not null default false,
  source text not null default 'post_payment_form',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ptm_client_document_data_customer_email
on public.ptm_client_document_data (customer_email);

create index if not exists idx_ptm_client_document_data_updated_at
on public.ptm_client_document_data (updated_at desc);

alter table public.ptm_client_document_data enable row level security;

drop policy if exists "service role can manage ptm client document data" on public.ptm_client_document_data;

create policy "service role can manage ptm client document data"
on public.ptm_client_document_data
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');