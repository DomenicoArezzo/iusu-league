-- ============================================================
-- IUSU LEAGUE — lettura pubblica (senza login)
-- Esegui questo file UNA VOLTA nel SQL Editor di Supabase.
--
-- Cosa fa: permette a chiunque (ruolo "anon", cioè chi non ha fatto login)
-- di LEGGERE i dati della lega: giocatori, partite, risultati, formazioni,
-- stagioni, premi e disponibilità. Le regole di scrittura NON cambiano:
-- continuano a scrivere solo l'admin (e ogni amico per la propria disponibilità).
--
-- Cosa NON rende pubblico (resta solo per utenti con login):
--   profiles       -> contiene le email degli utenti
--   player_ratings -> voti individuali degli amici
--   audit_log      -> registro modifiche (solo admin)
--   fantasy_*      -> fase 2
--
-- È sicuro rieseguirlo più volte. Per tornare indietro:
--   drop policy "public_read_<tabella>" on <tabella>;
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array[
    'seasons','players','matches','match_players','match_events',
    'availability','market_adjustments','manual_awards','settings'
  ] loop
    execute format('grant select on %I to anon', t);
    execute format('drop policy if exists "public_read_%1$s" on %1$s', t);
    execute format('create policy "public_read_%1$s" on %1$s for select to anon using (true)', t);
  end loop;
end $$;
