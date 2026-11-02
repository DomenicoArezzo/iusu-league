-- ============================================================
-- IUSU LEAGUE — iscrizioni alle partite (massimo 10 giocatori)
-- Esegui questo file UNA VOLTA nel SQL Editor di Supabase,
-- DOPO schema.sql e public_read.sql. È sicuro rieseguirlo.
--
-- Cosa fa:
--   * aggiunge alle partite: capienza (10), informazioni, chi l'ha creata
--     (le partite e i dati già presenti restano come sono)
--   * crea la tabella match_signups con le iscrizioni (una per utente e partita)
--   * crea tre funzioni che sono l'UNICO modo di scrivere:
--       create_match(...)  crea una partita (serve il login)
--       join_match(id)     iscrive l'utente che chiama
--       leave_match(id)    toglie l'iscrizione dell'utente che chiama
--   * il limite di 10 è garantito dal database (blocco di riga + trigger),
--     quindi regge anche a iscrizioni simultanee
--   * chiunque (anche senza login) può LEGGERE le iscrizioni; nessuno può
--     scriverle direttamente, tranne l'admin che può rimuoverne una
--
-- Lo stato "Aperta / Completa" non è salvato: si ricava dal numero di
-- iscritti, quindi non può mai andare fuori sincrono.
-- ============================================================

-- ---------- colonne nuove sulle partite ----------
alter table matches add column if not exists capacity smallint not null default 10;
alter table matches add column if not exists info text;
alter table matches add column if not exists created_by uuid references auth.users(id) on delete set null;

do $$
begin
  alter table matches add constraint matches_capacity_range check (capacity between 2 and 30);
exception when duplicate_object then null;
end $$;

-- ---------- iscrizioni ----------
create table if not exists match_signups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);
create index if not exists match_signups_match_idx on match_signups (match_id);

alter table match_signups enable row level security;

-- Nessuna scrittura diretta: si passa dalle funzioni qui sotto.
revoke all on match_signups from anon, authenticated;
grant select on match_signups to anon, authenticated;
grant delete on match_signups to authenticated;

drop policy if exists "public_read_match_signups" on match_signups;
create policy "public_read_match_signups" on match_signups
  for select to anon, authenticated using (true);

-- L'admin può togliere un iscritto (le altre scritture non esistono).
drop policy if exists "admin_delete_match_signups" on match_signups;
create policy "admin_delete_match_signups" on match_signups
  for delete to authenticated using (is_admin());

-- ---------- rete di sicurezza: mai più della capienza ----------
-- Prende il blocco sulla riga della partita, conta e rifiuta se è piena.
-- Vale anche per inserimenti fatti fuori dalle funzioni.
create or replace function enforce_signup_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; taken int;
begin
  select capacity into cap from matches where id = new.match_id for update;
  if not found then
    raise exception 'MATCH_NOT_FOUND';
  end if;
  select count(*) into taken from match_signups where match_id = new.match_id;
  if taken >= cap then
    raise exception 'MATCH_FULL';
  end if;
  return new;
end $$;

drop trigger if exists match_signups_capacity on match_signups;
create trigger match_signups_capacity before insert on match_signups
  for each row execute function enforce_signup_capacity();

-- ---------- crea una partita ----------
create or replace function create_match(
  p_played_at timestamptz,
  p_location text,
  p_info text default null,
  p_season_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  loc text := btrim(coalesce(p_location, ''));
  inf text := nullif(btrim(coalesce(p_info, '')), '');
  sid uuid;
  new_id uuid;
  open_count int;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_played_at is null or p_played_at <= now() or p_played_at > now() + interval '1 year' then
    raise exception 'INVALID_DATE';
  end if;
  if char_length(loc) = 0 or char_length(loc) > 60 then raise exception 'INVALID_LOCATION'; end if;
  if inf is not null and char_length(inf) > 500 then raise exception 'INVALID_INFO'; end if;

  if is_admin() then
    sid := coalesce(p_season_id, (select id from seasons where is_active limit 1));
  else
    -- freno anti-abuso: al massimo 5 partite future create dalla stessa persona
    select count(*) into open_count from matches
      where created_by = uid and status = 'programmata' and played_at > now();
    if open_count >= 5 then raise exception 'TOO_MANY_OPEN_MATCHES'; end if;
    sid := (select id from seasons where is_active limit 1);
  end if;

  insert into matches (season_id, played_at, location, info, created_by)
  values (sid, p_played_at, loc, inf, uid)
  returning id into new_id;
  return new_id;
end $$;

-- ---------- iscriviti ----------
create or replace function join_match(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m matches%rowtype;
  taken int;
  who text;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  -- Blocco sulla partita: le iscrizioni simultanee si mettono in fila qui.
  select * into m from matches where id = p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.status = 'annullata' then raise exception 'MATCH_CANCELLED'; end if;
  if m.status <> 'programmata' or m.played_at <= now() then raise exception 'MATCH_CLOSED'; end if;

  if exists (select 1 from match_signups where match_id = p_match_id and user_id = uid) then
    raise exception 'ALREADY_JOINED';
  end if;

  select count(*) into taken from match_signups where match_id = p_match_id;
  if taken >= m.capacity then raise exception 'MATCH_FULL'; end if;

  -- Nome mostrato a tutti: soprannome o nome del giocatore collegato, altrimenti il nome scelto all'iscrizione.
  -- Mai l'email.
  select coalesce(nullif(btrim(pl.nickname), ''), nullif(btrim(pl.first_name), ''), nullif(btrim(pr.display_name), ''))
    into who
    from profiles pr left join players pl on pl.id = pr.player_id
    where pr.id = uid;

  insert into match_signups (match_id, user_id, display_name)
  values (p_match_id, uid, left(coalesce(who, 'Giocatore'), 40));

  return jsonb_build_object('count', taken + 1, 'capacity', m.capacity, 'full', taken + 1 >= m.capacity);
end $$;

-- ---------- ritirati ----------
create or replace function leave_match(p_match_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m matches%rowtype;
  taken int;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into m from matches where id = p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if m.status <> 'programmata' or m.played_at <= now() then raise exception 'MATCH_CLOSED'; end if;

  delete from match_signups where match_id = p_match_id and user_id = uid;
  if not found then raise exception 'NOT_JOINED'; end if;

  select count(*) into taken from match_signups where match_id = p_match_id;
  return jsonb_build_object('count', taken, 'capacity', m.capacity, 'full', taken >= m.capacity);
end $$;

-- ---------- chi può chiamare cosa ----------
revoke all on function create_match(timestamptz, text, text, uuid) from public, anon;
revoke all on function join_match(uuid) from public, anon;
revoke all on function leave_match(uuid) from public, anon;
revoke all on function enforce_signup_capacity() from public, anon, authenticated;
grant execute on function create_match(timestamptz, text, text, uuid) to authenticated;
grant execute on function join_match(uuid) to authenticated;
grant execute on function leave_match(uuid) to authenticated;

-- ---------- aggiornamenti in tempo reale ----------
do $$
begin
  alter publication supabase_realtime add table match_signups;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
