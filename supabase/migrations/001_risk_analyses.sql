-- Run in Supabase SQL Editor or via CLI migrations.
-- Table used by the backend to log compliance/risk analysis results.

create table if not exists public.risk_analyses (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  query text not null,
  risk_summary text not null,
  risk_score double precision,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Optional: index for querying by session
create index if not exists risk_analyses_session_id_idx on public.risk_analyses (session_id);

-- Row Level Security: enable and add policies if clients access this table directly.
-- For backend-only inserts using the service role key, you can leave RLS disabled
-- or enable it and allow only service_role / authenticated policies as needed.
