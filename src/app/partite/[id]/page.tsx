"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/lib/app";
import { fmtDate, fmtTime } from "@/lib/derive";
import { getSupabase } from "@/lib/supabase";
import { STATUS_LABEL, TEAM_NAMES, playerName, type EventType } from "@/lib/types";
import Availability from "@/components/Availability";
import ResultEditor from "@/components/ResultEditor";
import TeamBuilder from "@/components/TeamBuilder";
import { Avatar, Badge, Button, Card, Empty, Icon, SectionTitle } from "@/components/ui";

const EVENT_LABEL: Record<EventType, string> = { goal: "Gol", assist: "Assist", own_goal: "Autogol", yellow: "Ammonizione", red: "Espulsione" };
const EVENT_DOT: Record<EventType, string> = {
  goal: "bg-pitch", assist: "bg-sky-300", own_goal: "bg-red-300", yellow: "bg-yellow-300", red: "bg-red-500",
};

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { matches, matchPlayers, events, players, session, isAdmin, write } = useApp();
  const match = matches.find((m) => m.id === id);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const lineup = useMemo(() => matchPlayers.filter((mp) => mp.match_id === id), [matchPlayers, id]);
  const evs = useMemo(() => events.filter((e) => e.match_id === id), [events, id]);

  if (!match) {
    return (
      <div className="space-y-3">
        <Empty>Partita non trovata.</Empty>
        <Link href="/partite" className="inline-flex min-h-tap items-center text-sm font-semibold text-pitch hover:underline">← Tutte le partite</Link>
      </div>
    );
  }

  const done = match.status === "conclusa";
  const finished = done || match.status === "da_confermare";
  const mvp = match.mvp_player_id ? byId.get(match.mvp_player_id) : null;

  const scorers = (side: "A" | "B") => {
    const ids = new Set(lineup.filter((l) => l.team === side).map((l) => l.player_id));
    const count = new Map<string, number>();
    for (const e of evs) if (e.type === "goal" && ids.has(e.player_id)) count.set(e.player_id, (count.get(e.player_id) ?? 0) + 1);
    const lines = [...count].map(([pid, n]) => `${byId.get(pid) ? playerName(byId.get(pid)!) : "?"}${n > 1 ? ` ×${n}` : ""}`);
    const og = evs.filter((e) => e.type === "own_goal" && lineup.find((l) => l.player_id === e.player_id)?.team === (side === "A" ? "B" : "A"));
    for (const e of og) lines.push(`${byId.get(e.player_id) ? playerName(byId.get(e.player_id)!) : "?"} (aut.)`);
    return lines;
  };

  async function remove() {
    if (!confirm("Eliminare definitivamente questa partita?")) return;
    const ok = await write(() => getSupabase().from("matches").delete().eq("id", id), "Partita eliminata");
    if (ok) router.replace("/partite");
  }

  const roster = (side: "A" | "B") =>
    lineup.filter((l) => l.team === side).map((l) => ({ l, p: byId.get(l.player_id) })).filter((x) => x.p);
  const bench = lineup.filter((l) => l.team === "R").map((l) => byId.get(l.player_id)).filter((p) => !!p);

  const timeline = evs.slice().sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
  const teamOf = (pid: string) => lineup.find((l) => l.player_id === pid)?.team;

  // Chi è loggato può usare il generatore di squadre (l'admin le salva). I visitatori vedono le formazioni salvate.
  const builderVisible = !!session && match.status !== "annullata" && !(finished && !isAdmin);
  const showLineup = lineup.length > 0 && !builderVisible;

  return (
    <div className="space-y-5">
      <Link href="/partite" className="inline-flex min-h-tap items-center text-sm font-semibold text-neutral-300 hover:text-white">← Tutte le partite</Link>

      <Card className="text-center">
        <div className="mb-2 flex justify-center gap-2">
          <Badge tone={done ? "green" : match.status === "annullata" ? "red" : "gold"}>{STATUS_LABEL[match.status]}</Badge>
        </div>
        <h1 className="sr-only">Partita del {fmtDate(match.played_at, { day: "numeric", month: "long", year: "numeric" })}</h1>
        <div className="text-sm capitalize text-neutral-300">
          {fmtDate(match.played_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-neutral-400">
          <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={16} /> ore {fmtTime(match.played_at)} · {match.duration_min}&apos;</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="pin" size={16} /> {match.location}</span>
        </div>
        <div
          className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3"
          aria-label={match.score_a != null && match.score_b != null && finished ? `${TEAM_NAMES.A} ${match.score_a}, ${TEAM_NAMES.B} ${match.score_b}` : `${TEAM_NAMES.A} contro ${TEAM_NAMES.B}`}
        >
          <div className="min-w-0 break-words text-right font-display text-xl font-bold uppercase sm:text-3xl"><span aria-hidden="true">⚪</span> {TEAM_NAMES.A}</div>
          <div className="font-display text-5xl font-extrabold sm:text-6xl">
            {match.score_a != null && match.score_b != null && finished ? `${match.score_a}–${match.score_b}` : "vs"}
          </div>
          <div className="min-w-0 break-words text-left font-display text-xl font-bold uppercase sm:text-3xl">{TEAM_NAMES.B} <span aria-hidden="true">⚫</span></div>
        </div>
        {finished && (
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 text-sm text-neutral-300">
            <div className="text-right">{scorers("A").join(", ")}</div>
            <div className="w-6" aria-hidden="true" />
            <div className="text-left">{scorers("B").join(", ")}</div>
          </div>
        )}
        {mvp && (
          <Link href={`/giocatori/${mvp.id}`} className="mt-3 inline-flex min-h-tap items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-3 text-sm text-gold hover:bg-gold/20">
            <Icon name="crown" size={16} /> MVP: <Avatar player={mvp} size={24} /> {playerName(mvp)}
          </Link>
        )}
        {match.notes && <p className="mt-3 text-sm italic text-neutral-300">“{match.notes}”</p>}
      </Card>

      {match.status === "programmata" && <Availability match={match} />}

      {showLineup && (
        <Card>
          <SectionTitle>Formazioni</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["A", "B"] as const).map((side) => (
              <div key={side}>
                <h3 className="mb-1 font-display text-lg font-bold uppercase">{TEAM_NAMES[side]}</h3>
                <ul className="space-y-1 text-sm">
                  {roster(side).map(({ l, p }) => (
                    <li key={l.id}>
                      <Link href={`/giocatori/${p!.id}`} className="flex min-h-9 items-center gap-2 hover:text-pitch">
                        <Avatar player={p!} size={26} /> {playerName(p!)} {l.is_gk && <Badge tone="gold">POR</Badge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {bench.length > 0 && (
            <p className="mt-3 border-t border-ink-600 pt-3 text-sm text-neutral-400">
              Panchina: {bench.map((p) => playerName(p!)).join(", ")}
            </p>
          )}
        </Card>
      )}

      {finished && timeline.length > 0 && (
        <Card>
          <SectionTitle>Cronologia</SectionTitle>
          <ul className="divide-y divide-ink-600">
            {timeline.map((e) => {
              const p = byId.get(e.player_id);
              const team = teamOf(e.player_id);
              return (
                <li key={e.id} className="flex min-h-tap items-center gap-3 py-2 text-sm">
                  <span className="w-9 shrink-0 text-right font-display text-lg font-bold text-neutral-400">{e.minute != null ? `${e.minute}'` : "–"}</span>
                  <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-sm ${EVENT_DOT[e.type]}`} />
                  <span className="font-semibold">{EVENT_LABEL[e.type]}</span>
                  {p ? <Link href={`/giocatori/${p.id}`} className="min-w-0 flex-1 truncate hover:text-pitch">{playerName(p)}</Link> : <span className="flex-1">?</span>}
                  {team && team !== "R" && <span className="shrink-0 text-xs text-neutral-400">{TEAM_NAMES[team]}</span>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {builderVisible && (
        <div id="squadre" className="scroll-mt-20">
          <TeamBuilder key={`${id}-${lineup.length}`} match={match} />
        </div>
      )}

      {isAdmin && (
        <>
          <ResultEditor key={`${match.id}-${match.status}-${match.score_a}-${match.score_b}`} match={match} />
          <div className="text-right"><Button variant="danger" onClick={remove}>Elimina partita</Button></div>
        </>
      )}
    </div>
  );
}
