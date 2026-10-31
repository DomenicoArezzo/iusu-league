-- ============================================================
-- IUSU LEAGUE — schema database (Supabase / PostgreSQL)
-- Esegui tutto questo file nel SQL Editor di Supabase.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- STAGIONI ----------
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null default current_date,
  ends_on date,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists one_active_season on seasons (is_active) where is_active;

-- ---------- GIOCATORI ----------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  nickname text,
  avatar_url text,
  status text not null default 'attivo' check (status in ('attivo','inattivo','indisponibile')),
  preferred_role text not null default 'jolly' check (preferred_role in ('portiere','difensore','centrocampista','attaccante','jolly')),
  shooting smallint not null default 5 check (shooting between 1 and 10),
  passing smallint not null default 5 check (passing between 1 and 10),
  dribbling smallint not null default 5 check (dribbling between 1 and 10),
  pace smallint not null default 5 check (pace between 1 and 10),
  defending smallint not null default 5 check (defending between 1 and 10),
  physical smallint not null default 5 check (physical between 1 and 10),
  technique smallint not null default 5 check (technique between 1 and 10),
  vision smallint not null default 5 check (vision between 1 and 10),
  saves smallint not null default 5 check (saves between 1 and 10),
  initial_value numeric(8,1) not null default 25,
  created_at timestamptz not null default now()
);

-- ---------- PROFILI UTENTE (collegati a auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'member' check (role in ('admin','member')),
  player_id uuid references players(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- PARTITE ----------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id) on delete set null,
  played_at timestamptz not null,
  location text not null default 'Iusu',
  duration_min int not null default 60,
  status text not null default 'programmata'
    check (status in ('programmata','in_corso','da_confermare','conclusa','annullata')),
  score_a int,
  score_b int,
  mvp_player_id uuid references players(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists matches_played_at_idx on matches (played_at);

create table if not exists match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team text not null check (team in ('A','B','R')),   -- R = riserva
  is_gk boolean not null default false,
  unique (match_id, player_id)
);

create table if not exists match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  type text not null check (type in ('goal','assist','own_goal','yellow','red')),
  minute int,
  created_at timestamptz not null default now()
);
create index if not exists match_events_match_idx on match_events (match_id);

-- ---------- DISPONIBILITA' ----------
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  status text not null check (status in ('yes','maybe','no')),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);

-- ---------- PAGELLE (voti degli amici) ----------
create table if not exists player_ratings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  score numeric(3,1) not null check (score between 1 and 10),
  comment text,
  created_at timestamptz not null default now(),
  unique (match_id, player_id, voter_id)
);

-- ---------- MERCATO: correzioni manuali dell'admin ----------
create table if not exists market_adjustments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  delta numeric(8,1) not null,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------- PREMI ASSEGNATI A MANO ----------
create table if not exists manual_awards (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id) on delete cascade,
  award_key text not null,
  player_id uuid references players(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  unique (season_id, award_key)
);

-- ---------- IMPOSTAZIONI (parametri mercato, rendimento, algoritmi) ----------
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- REGISTRO MODIFICHE ----------
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FASE 2 (predisposto, senza interfaccia): Fantacalcio e mercato
-- ============================================================
create table if not exists fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  budget numeric(10,1) not null default 500,
  created_at timestamptz not null default now(),
  unique (season_id, owner_id)
);
create table if not exists fantasy_roster (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references fantasy_teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  price numeric(10,1) not null default 0,
  is_starter boolean not null default false,
  unique (team_id, player_id)
);
create table if not exists fantasy_auctions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  opens_at timestamptz not null default now(),
  closes_at timestamptz,
  winning_team_id uuid references fantasy_teams(id),
  winning_bid numeric(10,1)
);
create table if not exists fantasy_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references fantasy_auctions(id) on delete cascade,
  team_id uuid not null references fantasy_teams(id) on delete cascade,
  amount numeric(10,1) not null,
  created_at timestamptz not null default now()
);
create table if not exists fantasy_transactions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  team_id uuid not null references fantasy_teams(id) on delete cascade,
  player_id uuid references players(id) on delete set null,
  type text not null check (type in ('buy','sell','auction_win','adjustment')),
  amount numeric(10,1) not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FUNZIONI DI SUPPORTO
-- ============================================================
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function my_player_id() returns uuid
language sql stable security definer set search_path = public as $$
  select player_id from profiles where id = auth.uid();
$$;

-- Alla registrazione crea il profilo. Il PRIMO utente diventa admin.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when exists (select 1 from profiles) then 'member' else 'admin' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Registro modifiche automatico
create or replace function log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec jsonb;
begin
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into audit_log (user_id, action, entity, entity_id, details)
  values (auth.uid(), tg_op, tg_table_name, coalesce(rec->>'id', rec->>'key'), rec);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['players','matches','match_players','match_events','seasons','settings','profiles','market_adjustments','manual_awards']
  loop
    execute format('drop trigger if exists audit_%1$s on %1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on %1$s for each row execute function log_change()', t);
  end loop;
end $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Lettura: ogni utente registrato. Scrittura: solo admin
-- (tranne disponibilità e pagelle, che ogni amico gestisce per sé).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'seasons','players','profiles','matches','match_players','match_events','availability',
    'player_ratings','market_adjustments','manual_awards','settings','audit_log',
    'fantasy_teams','fantasy_roster','fantasy_auctions','fantasy_bids','fantasy_transactions'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;

  -- lettura per utenti autenticati + scrittura admin sulle tabelle "ufficiali"
  foreach t in array array[
    'seasons','players','matches','match_players','match_events',
    'market_adjustments','manual_awards','settings'
  ] loop
    execute format('drop policy if exists "read_%1$s" on %1$s', t);
    execute format('create policy "read_%1$s" on %1$s for select to authenticated using (true)', t);
    execute format('drop policy if exists "admin_write_%1$s" on %1$s', t);
    execute format('create policy "admin_write_%1$s" on %1$s for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- profili: tutti leggono, solo admin modifica (il trigger crea la riga)
drop policy if exists "read_profiles" on profiles;
create policy "read_profiles" on profiles for select to authenticated using (true);
drop policy if exists "admin_write_profiles" on profiles;
create policy "admin_write_profiles" on profiles for update to authenticated using (is_admin()) with check (is_admin());

-- registro: solo admin
drop policy if exists "admin_read_audit" on audit_log;
create policy "admin_read_audit" on audit_log for select to authenticated using (is_admin());

-- disponibilità: ognuno per il proprio giocatore collegato; admin per tutti
drop policy if exists "read_availability" on availability;
create policy "read_availability" on availability for select to authenticated using (true);
drop policy if exists "own_availability_write" on availability;
create policy "own_availability_write" on availability for all to authenticated
  using (is_admin() or player_id = my_player_id())
  with check (is_admin() or player_id = my_player_id());

-- pagelle: ognuno vota a proprio nome (non può votare se stesso)
drop policy if exists "read_ratings" on player_ratings;
create policy "read_ratings" on player_ratings for select to authenticated using (true);
drop policy if exists "own_ratings_write" on player_ratings;
create policy "own_ratings_write" on player_ratings for all to authenticated
  using (voter_id = auth.uid() or is_admin())
  with check ((voter_id = auth.uid() and player_id is distinct from my_player_id()) or is_admin());

-- fantacalcio (fase 2): lettura per tutti, scrittura admin; i dettagli verranno rifiniti in fase 2
do $$
declare t text;
begin
  foreach t in array array['fantasy_teams','fantasy_roster','fantasy_auctions','fantasy_bids','fantasy_transactions'] loop
    execute format('drop policy if exists "read_%1$s" on %1$s', t);
    execute format('create policy "read_%1$s" on %1$s for select to authenticated using (true)', t);
    execute format('drop policy if exists "admin_write_%1$s" on %1$s', t);
    execute format('create policy "admin_write_%1$s" on %1$s for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- ============================================================
-- AGGIORNAMENTI IN TEMPO REALE
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['players','matches','match_players','match_events','availability','seasons','settings','market_adjustments','manual_awards','player_ratings']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================
-- DATI INIZIALI
-- ============================================================
insert into seasons (name, starts_on, is_active)
select 'Stagione 2026/27', date '2026-09-01', true
where not exists (select 1 from seasons);

insert into settings (key, value) values
  ('market', '{"mvp":5,"goal":2,"assist":1,"win":2,"draw":0,"loss":-1,"appearance":0.5,"own_goal":-2,"yellow":-0.5,"red":-3,"rating_factor":1,"min_value":1}'),
  ('rating', '{"base":6,"goal":0.8,"assist":0.5,"win":0.5,"draw":0,"loss":-0.3,"mvp":1,"own_goal":-1,"yellow":-0.2,"red":-1.5,"clean_sheet":0.5}'),
  ('algo', '{"min_matches":3,"variety":1,"form_weight":0.3,"winrate_weight":0.2,"form_matches":5}')
on conflict (key) do nothing;
