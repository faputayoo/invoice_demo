create table if not exists public.invoice_jobs (
  job_id text primary key,
  created_at timestamptz not null,
  payload jsonb not null
);

create index if not exists invoice_jobs_created_at_idx
  on public.invoice_jobs (created_at desc);

insert into storage.buckets (id, name, public)
values ('invoice-source-files', 'invoice-source-files', false)
on conflict (id) do nothing;