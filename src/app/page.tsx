"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/app";
import { fmtDate, fmtTime, useStats } from "@/lib/derive";
import { buildRankings } from "@/lib/rankings";
import { computeRecords } from "@/lib/stats";
import { TEAM_NAMES, playerName, type Player } from "@/lib/types";
import MatchRow from "@/components/MatchRow";
import { Avatar, Badge, Button, Card, Empty, MEDAL, SectionTitle } from "@/components/ui";

function Leader({ title, icon, player, value }: { title: string; icon: string; player?: Player; value?: string }) {
  return (
    <Card className="!p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{icon} {title}</div>
      {player ? (
        <Link href={`/giocatori/${player.id}`} className="mt-2 flex items-center gap-2 hover:text-pitch">
          <Avatar player={player} size={36} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{playerName(player)}</div>
            <div className="font-display text-lg font-bold text-gold">{value}</div>
          </div>
        </Link>
      ) : (
        <div className="mt-2 text-sm text-neutral-600">–</div>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { players, matches, availability, activeSeason, settings } = useApp();
  const period = activeSeason ? ({ kind: "season", seasonId: activeSeason.id } as const) : ({ kind: "all" } as const);
  const { stats, matches: seasonMatches } = useStats(period);
  const { confirmed } = useStats();

  const rankings = useMemo(() => buildRankings(players, stats, settings.algo.min_matches), [players, stats, settings.algo.min_matches]);
  const rank = (key: string) => rankings.find((r) => r.key === key)?.rows ?? [];
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const records = useMemo(() => computeRecords(stats, seasonMatches), [stats, seasonMatches]);

  const now = Date.now();
  const next = useMemo(
    () =>
      matches
        .filter((m) => (m.status === "programmata" || m.status === "in_corso") && new Date(m.played_at).getTime() > now - 4 * 3600_000)
        .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())[0],
    [matches, now],
  );
  const last = confirmed[confirmed.length - 1];
  const recent = confirmed.slice(-5).reverse();
  const av = next ? availability.filter((a) => a.match_id === next.id) : [];
  const yes = av.filter((a) => a.status === "yes");

  const top = (key: string) => {
    const r = rank(key)[0];
    return { p: r ? byId.get(r.playerId) : undefined, v: r?.display };
  };
  const best = top("best");
  const scorer = top("scorers");
  const assist = top("assists");
  const mvp = top("mvps");
  const topRows = rank("best").slice(0, 5);


  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">
          Benvenuti in <span className="text-pitch">Iusu League</span>
        </h1>
        <p className="mt-2 text-neutral-400">{activeSeason ? activeSeason.name : "Nessuna stagione attiva"} · {seasonMatches.length} partite ufficiali</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-pitch/40 shadow-glow">
          <SectionTitle right={next && <Badge tone="green">Prossima partita</Badge>}>{next ? "Si gioca" : "Prossima partita"}</SectionTitle>
          {next ? (
            <>
              <div className="font-display text-3xl font-bold capitalize">{fmtDate(next.played_at, { weekday: "long", day: "numeric", month: "long" })}</div>
              <div className="text-neutral-400">ore {fmtTime(next.played_at)} · {next.location}</div>
              <div className="mt-4 flex items-center gap-3">
                <div className="font-display text-4xl font-extrabold text-pitch">{yes.length}</div>
                <div className="text-sm text-neutral-400">
                  confermati su 10 posti
                  <div className="text-xs">{av.filter((a) => a.status === "maybe").length} forse · {av.filter((a) => a.status === "no").length} non ci sono</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/partite/${next.id}`}><Button variant="primary">Dai la tua disponibilità</Button></Link>
                <Link href={`/partite/${next.id}`}><Button>Genera le squadre</Button></Link>
              </div>
            </>
          ) : (
            <Empty>Nessuna partita in programma.{" "}<Link href="/partite" className="text-pitch underline">Vai alle partite</Link></Empty>
          )}
        </Card>

        <Card>
          <SectionTitle>Ultimo risultato</SectionTitle>
          {last ? (
            <Link href={`/partite/${last.id}`} className="block text-center hover:text-pitch">
              <div className="text-sm capitalize text-neutral-400">{fmtDate(last.played_at, { weekday: "long", day: "numeric", month: "long" })}</div>
              <div className="my-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="text-right font-display text-xl font-bold uppercase">{TEAM_NAMES.A}</div>
                <div className="font-display text-5xl font-extrabold">{last.score_a}–{last.score_b}</div>
                <div className="text-left font-display text-xl font-bold uppercase">{TEAM_NAMES.B}</div>
              </div>
              {last.mvp_player_id && byId.get(last.mvp_player_id) && <div className="text-sm text-gold">👑 MVP {playerName(byId.get(last.mvp_player_id)!)}</div>}
            </Link>
          ) : (
            <Empty>Ancora nessuna partita confermata.</Empty>
          )}
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Leader title="Miglior giocatore" icon="🏆" player={best.p} value={best.v} />
        <Leader title="Capocannoniere" icon="⚽" player={scorer.p} value={scorer.v ? `${scorer.v} gol` : undefined} />
        <Leader title="Leader assist" icon="🎯" player={assist.p} value={assist.v ? `${assist.v} assist` : undefined} />
        <Leader title="Re degli MVP" icon="👑" player={mvp.p} value={mvp.v ? `${mvp.v} MVP` : undefined} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle right={<Link href="/classifiche" className="text-sm text-pitch hover:underline">Tutte →</Link>}>Classifica generale</SectionTitle>
          {topRows.length === 0 ? (
            <Empty>Servono almeno {settings.algo.min_matches} partite per giocatore.</Empty>
          ) : (
            <ol className="divide-y divide-ink-600">
              {topRows.map((r, i) => {
                const p = byId.get(r.playerId);
                return p ? (
                  <li key={r.playerId}>
                    <Link href={`/giocatori/${p.id}`} className="flex items-center gap-3 py-2 hover:text-pitch">
                      <span className="w-7 text-center text-lg">{MEDAL[i] ?? i + 1}</span>
                      <Avatar player={p} size={32} />
                      <span className="flex-1 truncate font-semibold">{playerName(p)}</span>
                      <span className="text-xs text-neutral-500">{r.sub}</span>
                      <span className="w-14 text-right font-display text-xl font-bold">{r.display}</span>
                    </Link>
                  </li>
                ) : null;
              })}
            </ol>
          )}
        </Card>

        <Card>
          <SectionTitle right={<Link href="/partite" className="text-sm text-pitch hover:underline">Tutte →</Link>}>Ultime partite</SectionTitle>
          {recent.length === 0 ? <Empty>Nessuna partita ancora.</Empty> : <div className="space-y-2">{recent.map((m) => <MatchRow key={m.id} m={m} />)}</div>}
        </Card>
      </div>

      <Card className="mt-5">
        <SectionTitle>Record della stagione</SectionTitle>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Record label="Più gol in una partita" text={records.topGoalsInMatch ? `${playerName(byId.get(records.topGoalsInMatch.playerId)!)} · ${records.topGoalsInMatch.goals}` : undefined} />
          <Record label="Vittoria più larga" text={records.biggestWin ? `${records.biggestWin.margin} gol di scarto` : undefined} />
          <Record label="Partita più ricca di gol" text={records.highestScoring ? `${records.highestScoring.total} gol totali` : undefined} />
          <Record label="Striscia di vittorie" text={records.longestWinStreak ? `${playerName(byId.get(records.longestWinStreak.playerId)!)} · ${records.longestWinStreak.length}` : undefined} />
        </div>
      </Card>
    </>
  );
}

function Record({ label, text }: { label: string; text?: string }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-900 p-3">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="font-display text-xl font-bold text-gold">{text ?? "–"}</div>
    </div>
  );
}
