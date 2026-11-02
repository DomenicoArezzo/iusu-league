"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/app";
import { fmtDate, fmtTime, useStats } from "@/lib/derive";
import { buildNews, type NewsKind } from "@/lib/news";
import { computeOverall } from "@/lib/overall";
import { buildRankings } from "@/lib/rankings";
import { computeRecords } from "@/lib/stats";
import { capacityOf, signupState } from "@/lib/signups";
import { TEAM_NAMES, playerName, type Player } from "@/lib/types";
import MatchRow from "@/components/MatchRow";
import { seatsText } from "@/components/Signups";
import { Avatar, Badge, Card, Empty, Icon, LinkButton, MoreLink, Rank, SeatsBar, SectionTitle, type IconName } from "@/components/ui";

const NEWS_ICON: Record<NewsKind, IconName> = { cancelled: "info", pending: "clock", note: "ball", newPlayer: "users" };

function Leader({ title, icon, player, value }: { title: string; icon: IconName; player?: Player; value?: string }) {
  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-800/80 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        <Icon name={icon} size={16} className="text-gold" /> {title}
      </div>
      {player ? (
        <Link href={`/giocatori/${player.id}`} className="mt-2 flex min-h-tap items-center gap-2 hover:text-pitch">
          <Avatar player={player} size={36} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{playerName(player)}</div>
            <div className="font-display text-lg font-bold leading-tight text-gold">{value}</div>
          </div>
        </Link>
      ) : (
        <div className="mt-2 text-sm text-neutral-500">Non ancora disponibile</div>
      )}
    </div>
  );
}

function Record({ label, text }: { label: string; text?: string }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-900 p-3">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="font-display text-xl font-bold text-gold">{text ?? "–"}</div>
    </div>
  );
}

export default function Dashboard() {
  const { players, matches, matchPlayers, signupsByMatch, activeSeason, settings, session, isAdmin } = useApp();
  const period = activeSeason ? ({ kind: "season", seasonId: activeSeason.id } as const) : ({ kind: "all" } as const);
  const { stats, matches: seasonMatches } = useStats(period);
  const { confirmed } = useStats();

  const rankings = useMemo(() => buildRankings(players, stats, settings.algo.min_matches), [players, stats, settings.algo.min_matches]);
  const rank = (key: string) => rankings.find((r) => r.key === key)?.rows ?? [];
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const records = useMemo(() => computeRecords(stats, seasonMatches), [stats, seasonMatches]);

  const now = useMemo(() => Date.now(), [matches]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = useMemo(
    () =>
      matches
        .filter((m) => (m.status === "programmata" || m.status === "in_corso") && new Date(m.played_at).getTime() > now - 4 * 3600_000)
        .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())[0],
    [matches, now],
  );
  const last = confirmed[confirmed.length - 1];
  const recent = confirmed.slice(-5).reverse();
  // Iscritti alla prossima partita (max 10): è il dato che il database garantisce.
  const taken = next ? (signupsByMatch.get(next.id)?.length ?? 0) : 0;
  const capacity = next ? capacityOf(next) : 10;
  const nextState = next ? signupState(next, taken, now) : "chiusa";
  const left = Math.max(0, capacity - taken);

  const top = (key: string) => {
    const r = rank(key)[0];
    return { p: r ? byId.get(r.playerId) : undefined, v: r?.display };
  };
  const best = top("best");
  const scorer = top("scorers");
  const assist = top("assists");
  const mvp = top("mvps");
  const topRows = rank("best").slice(0, 5);

  const news = useMemo(() => buildNews(matches, players, now), [matches, players, now]);

  // Squadre: formazioni della prossima partita se già pronte, altrimenti dell'ultima giocata.
  const lineupMatch = next && matchPlayers.some((mp) => mp.match_id === next.id) ? next : last;
  const lineup = useMemo(() => {
    if (!lineupMatch) return null;
    const side = (s: "A" | "B") =>
      matchPlayers.filter((mp) => mp.match_id === lineupMatch.id && mp.team === s).map((mp) => byId.get(mp.player_id)).filter((p): p is Player => !!p);
    const a = side("A");
    const b = side("B");
    return a.length + b.length > 0 ? { a, b } : null;
  }, [lineupMatch, matchPlayers, byId]);

  const roster = useMemo(
    () => players.filter((p) => p.status === "attivo").sort((a, b) => computeOverall(b) - computeOverall(a)),
    [players],
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-6xl">
          Iusu <span className="text-pitch">League</span>
        </h1>
        <p className="mt-2 text-neutral-400">
          {activeSeason ? activeSeason.name : "Nessuna stagione attiva"} · {seasonMatches.length} partite ufficiali
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* ---------- Prossima partita ---------- */}
        <Card className="border-pitch/40 shadow-glow">
          <SectionTitle right={next && <Badge tone={next.status === "in_corso" ? "gold" : "green"}>{next.status === "in_corso" ? "In corso" : "Prossima partita"}</Badge>}>
            {next ? "Si gioca" : "Prossima partita"}
          </SectionTitle>
          {next ? (
            <>
              <div className="font-display text-3xl font-bold capitalize sm:text-4xl">
                {fmtDate(next.played_at, { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-300">
                <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={18} className="text-pitch" /> ore {fmtTime(next.played_at)}</span>
                <span className="inline-flex items-center gap-1.5"><Icon name="pin" size={18} className="text-pitch" /> {next.location}</span>
              </div>

              <div className="mt-4" aria-live="polite">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-4xl font-extrabold text-pitch">
                    {taken}
                    <span className="text-neutral-400">/{capacity}</span>
                  </span>
                  <span className="text-sm text-neutral-300">iscritti · {seatsText(taken, capacity, nextState)}</span>
                </div>
                <div className="mt-2">
                  <SeatsBar taken={taken} capacity={capacity} full={left === 0} label="Iscritti alla prossima partita" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <LinkButton href={`/partite/${next.id}`} variant="primary">
                  {nextState === "aperta" ? "Iscriviti alla partita" : "Vedi la partita"}
                </LinkButton>
                {session ? (
                  <LinkButton href={`/partite/${next.id}#squadre`}>Genera le squadre</LinkButton>
                ) : (
                  <LinkButton href="/login">Accedi</LinkButton>
                )}
              </div>
            </>
          ) : (
            <Empty>
              Nessuna partita in programma.{" "}
              <Link href="/partite" className="font-semibold text-pitch underline">{isAdmin ? "Creane una" : "Vai alle partite"}</Link>
            </Empty>
          )}
        </Card>

        {/* ---------- Ultimo risultato ---------- */}
        <Card>
          <SectionTitle>Ultimo risultato</SectionTitle>
          {last ? (
            <Link href={`/partite/${last.id}`} className="group block text-center">
              <div className="text-sm capitalize text-neutral-400">{fmtDate(last.played_at, { weekday: "long", day: "numeric", month: "long" })}</div>
              <div className="my-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-label={`${TEAM_NAMES.A} ${last.score_a}, ${TEAM_NAMES.B} ${last.score_b}`}>
                <div className="text-right font-display text-xl font-bold uppercase sm:text-2xl">{TEAM_NAMES.A}</div>
                <div className="font-display text-5xl font-extrabold sm:text-6xl">{last.score_a}–{last.score_b}</div>
                <div className="text-left font-display text-xl font-bold uppercase sm:text-2xl">{TEAM_NAMES.B}</div>
              </div>
              {last.mvp_player_id && byId.get(last.mvp_player_id) && (
                <div className="inline-flex items-center gap-1.5 text-sm text-gold"><Icon name="crown" size={16} /> MVP {playerName(byId.get(last.mvp_player_id)!)}</div>
              )}
              <div className="mt-2 inline-flex min-h-tap items-center gap-1 text-sm font-semibold text-pitch group-hover:underline">
                Dettagli partita <Icon name="chevron" size={16} />
              </div>
            </Link>
          ) : (
            <Empty>Ancora nessuna partita confermata.</Empty>
          )}
        </Card>
      </div>

      {/* ---------- Novità dalla lega (solo se c'è qualcosa da dire) ---------- */}
      {news.length > 0 && (
        <Card>
          <SectionTitle>Novità dalla lega</SectionTitle>
          <ul className="divide-y divide-ink-600">
            {news.map((n) => {
              const body = (
                <>
                  <Icon name={NEWS_ICON[n.kind]} size={20} className="mt-0.5 text-gold" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{n.title}</span>
                    {n.text && <span className="block text-sm text-neutral-400">{n.text}</span>}
                  </span>
                  <span className="shrink-0 text-xs capitalize text-neutral-400">{fmtDate(n.date, { day: "numeric", month: "short" })}</span>
                </>
              );
              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link href={n.href} className="flex min-h-tap items-start gap-3 py-2.5 hover:text-pitch">{body}</Link>
                  ) : (
                    <div className="flex items-start gap-3 py-2.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ---------- Classifica ---------- */}
        <Card>
          <SectionTitle right={<MoreLink href="/classifiche">Tutte</MoreLink>}>Classifica generale</SectionTitle>
          {topRows.length === 0 ? (
            <Empty>La classifica compare quando i giocatori hanno almeno {settings.algo.min_matches} partite ufficiali.</Empty>
          ) : (
            <ol className="divide-y divide-ink-600">
              {topRows.map((r, i) => {
                const p = byId.get(r.playerId);
                return p ? (
                  <li key={r.playerId}>
                    <Link href={`/giocatori/${p.id}`} className="flex min-h-tap items-center gap-3 py-2 hover:text-pitch">
                      <Rank pos={i} />
                      <Avatar player={p} size={34} />
                      <span className="min-w-0 flex-1 truncate font-semibold">{playerName(p)}</span>
                      <span className="hidden text-xs text-neutral-400 sm:inline">{r.sub}</span>
                      <span className="w-14 text-right font-display text-xl font-bold">{r.display}</span>
                    </Link>
                  </li>
                ) : null;
              })}
            </ol>
          )}
        </Card>

        {/* ---------- Ultime partite ---------- */}
        <Card>
          <SectionTitle right={<MoreLink href="/partite">Tutte</MoreLink>}>Ultime partite</SectionTitle>
          {recent.length === 0 ? <Empty>Nessuna partita ancora.</Empty> : <div className="space-y-2">{recent.map((m) => <MatchRow key={m.id} m={m} />)}</div>}
        </Card>
      </div>

      {/* ---------- Statistiche principali ---------- */}
      <section aria-labelledby="stat-titolo">
        <h2 id="stat-titolo" className="mb-3 font-display text-xl font-bold uppercase tracking-wide">Statistiche della stagione</h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Leader title="Miglior giocatore" icon="trophy" player={best.p} value={best.v} />
          <Leader title="Capocannoniere" icon="ball" player={scorer.p} value={scorer.v ? `${scorer.v} gol` : undefined} />
          <Leader title="Leader assist" icon="target" player={assist.p} value={assist.v ? `${assist.v} assist` : undefined} />
          <Leader title="Re degli MVP" icon="crown" player={mvp.p} value={mvp.v ? `${mvp.v} MVP` : undefined} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Record label="Più gol in una partita" text={records.topGoalsInMatch ? `${playerName(byId.get(records.topGoalsInMatch.playerId)!)} · ${records.topGoalsInMatch.goals}` : undefined} />
          <Record label="Vittoria più larga" text={records.biggestWin ? `${records.biggestWin.margin} gol di scarto` : undefined} />
          <Record label="Partita più ricca di gol" text={records.highestScoring ? `${records.highestScoring.total} gol totali` : undefined} />
          <Record label="Striscia di vittorie" text={records.longestWinStreak ? `${playerName(byId.get(records.longestWinStreak.playerId)!)} · ${records.longestWinStreak.length}` : undefined} />
        </div>
      </section>

      {/* ---------- Squadre e giocatori ---------- */}
      <Card>
        <SectionTitle right={<MoreLink href="/giocatori">Tutta la rosa</MoreLink>}>Squadre e giocatori</SectionTitle>
        {lineup && lineupMatch ? (
          <div className="mb-4">
            <div className="mb-2 text-sm text-neutral-400">
              Formazioni {lineupMatch === next ? "della prossima partita" : "dell'ultima partita"} ·{" "}
              <Link href={`/partite/${lineupMatch.id}`} className="font-semibold text-pitch hover:underline capitalize">
                {fmtDate(lineupMatch.played_at, { weekday: "short", day: "numeric", month: "short" })}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([["A", lineup.a], ["B", lineup.b]] as const).map(([s, list]) => (
                <div key={s} className="rounded-xl border border-ink-600 bg-ink-900 p-3">
                  <div className="mb-1.5 font-display text-lg font-bold uppercase">{TEAM_NAMES[s]} <span className="text-sm text-neutral-400">({list.length})</span></div>
                  <ul className="flex flex-wrap gap-1.5">
                    {list.map((p) => (
                      <li key={p.id}>
                        <Link href={`/giocatori/${p.id}`} className="inline-flex min-h-9 items-center rounded-full bg-ink-700 px-3 text-sm hover:text-pitch">{playerName(p)}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mb-4 text-sm text-neutral-400">Le formazioni compaiono qui appena vengono definite per una partita.</p>
        )}

        {roster.length === 0 ? (
          <Empty>Nessun giocatore in rosa.</Empty>
        ) : (
          <>
            <div className="mb-2 text-sm text-neutral-400">{roster.length} giocatori attivi · i più forti in rosa</div>
            <ul className="flex flex-wrap gap-2">
              {roster.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <Link href={`/giocatori/${p.id}`} className="flex min-h-tap items-center gap-2 rounded-full border border-ink-600 bg-ink-900 py-1 pl-1 pr-3 text-sm font-semibold hover:border-pitch/70">
                    <Avatar player={p} size={32} /> {playerName(p)}
                    <span className="font-display text-base text-gold">{computeOverall(p)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
