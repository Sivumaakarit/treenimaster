-- ============================================================================
-- TREENIMASTER – SUPABASE SQL-SKEEMA (PostgreSQL + RLS)
-- Aja tämä koko tiedosto Supabasen SQL Editorissa (New Query -> Run).
-- ============================================================================

-- 1. YDINOHJELMA (8 kierron perusvoimajakso + 4 viikon piikkausjakso)
create table if not exists public.treenimaster_programs (
  id text primary key,
  cycle_number integer not null,
  workout_number integer not null, -- 1 (A-päivä: DL+B+L), 2 (B-päivä: S+Volyymileuat), 3 (C-päivä: Nopeus & kehonhallinta)
  phase text not null default 'base', -- 'base' (Kierrot 1-8) tai 'peaking' (Viikot 9-12)
  title text not null,
  structure_label text not null,
  rest_days_afterMin integer not null default 2,
  rest_days_afterMax integer not null default 3,
  rest_between_sets text not null default '3–5 min',
  coach_notes text,
  exercises jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TOTEUTUNEET TREENIT, KALENTERIMERKINNÄT JA TUNTEMUKSET
-- Yhdistetty suoritus- ja kalenteritaulu (voimatreenit, juoksu, tennis, hiihto, muu/lepo)
create table if not exists public.treenimaster_logs (
  id text primary key,
  performed_date date not null,
  category text not null check (category in ('strength', 'run', 'tennis', 'ski', 'other', 'rest')),
  title text not null,
  cycle_number integer,
  workout_number integer,
  program_id text references public.treenimaster_programs(id) on delete set null,
  duration_minutes integer,
  rpe numeric(3,1),
  -- Toteutuneet sarjat, toistot ja painot (voimatreenissä)
  exercises jsonb not null default '[]'::jsonb,
  -- Subjektiiviset tuntemukset (happi, jaksaminen, palautuminen, alaselän/hermoston tila)
  feelings text,
  oxygen_score integer check (oxygen_score between 1 and 5),
  energy_score integer check (energy_score between 1 and 5),
  recovery_status text default 'normaali', -- 'erinomainen' | 'normaali' | 'tukkoinen' | 'flunssainen'
  source text default 'manual', -- 'workout_view' | 'coach_chat' | 'calendar' | 'voice'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. VALMENTAJAN KESKUSTELUHISTORIA & MUUTOSEHDOTUKSET
create table if not exists public.treenimaster_messages (
  id text primary key,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  logged_workout_id text references public.treenimaster_logs(id) on delete set null,
  program_proposal jsonb, -- Jos valmentaja ehdottaa perusteltua muutosta ohjelmaan (vaatii käyttäjän hyväksynnän)
  proposal_status text default null, -- 'pending' | 'approved' | 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indeksit nopeita kalenteri- ja aikasarjahakuja varten
create index if not exists idx_treenimaster_logs_date on public.treenimaster_logs(performed_date desc);
create index if not exists idx_treenimaster_logs_category on public.treenimaster_logs(category);
create index if not exists idx_treenimaster_programs_cycle on public.treenimaster_programs(cycle_number, workout_number);
create index if not exists idx_treenimaster_messages_created on public.treenimaster_messages(created_at asc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) – Local-first + Anon-avain yhteensopiva
-- ============================================================================

alter table public.treenimaster_programs enable row level security;
alter table public.treenimaster_logs enable row level security;
alter table public.treenimaster_messages enable row level security;

drop policy if exists "Salli ohjelman luku ja päivitys" on public.treenimaster_programs;
create policy "Salli ohjelman luku ja päivitys"
  on public.treenimaster_programs for all
  using (true)
  with check (true);

drop policy if exists "Salli treenilokien hallinta" on public.treenimaster_logs;
create policy "Salli treenilokien hallinta"
  on public.treenimaster_logs for all
  using (true)
  with check (true);

drop policy if exists "Salli keskustelujen hallinta" on public.treenimaster_messages;
create policy "Salli keskustelujen hallinta"
  on public.treenimaster_messages for all
  using (true)
  with check (true);
