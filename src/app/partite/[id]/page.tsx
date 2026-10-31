"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/lib/app";
import { fmtDate, fmtTime } from "@/lib/derive";
import { getSupabase } from "@/lib/supabase";
import { STATUS_LABEL, TEAM_NAMES, playerName } from "@/lib/types";
import Availability from "@/components/Availability";
import ResultEditor from "@/components/ResultEditor";
import TeamBuilder from "@/components/TeamBuilder";
import { Badge, Button, Card, SectionTitle, Spinner, Avatar } from "@/components/ui";

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { matches, matchPlayers, events, players, isAdmin, write } = useApp();
  const match = matches.find((m) => m.id === id);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const lineup = useMemo(() => matchPlayers.filter((mp) => mp.match_id === id), [matchPlayers, id]);
  const evs = useMemo(() => events.filter((e) => e.match_id === id), [events, id]);

  if (!match) return <Spinner label="Partita non trovata." />;

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

  return (
    <>
      <Link href="/partite" className="mb-4 inline-block text-sm text-neutral-400 hover:text-white">← Tutte le partite</Link>

      <Card className="mb-5 text-center">
        <div className="mb-2 flex justify-center gap-2">
          <Badge tone={done ? "green" : match.status === "annullata" ? "red" : "gold"}>{STATUS_LABEL[match.status]}</Badge>
        </div>
        <div className="text-sm capitalize text-neutral-400">
          {fmtDate(match.played_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {fmtTime(match.played_at)} · {match.location} · {match.duration_min}&apos;
        </div>
        <div className="my-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-right font-display text-2xl font-bold uppercase sm:text-3xl">⚪ {TEAM_NAMES.A}</div>
          <div className="font-display text-5xl font-extrabold sm:text-6xl">
            {match.score_a != null && match.score_b != null && finished ? `${match.score_a}–${match.score_b}` : "vs"}
          </div>
          <div className="text-left font-display text-2xl font-bold uppercase sm:text-3xl">{TEAM_NAMES.B} ⚫</div>
        </div>
        {finished && (
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 text-sm text-neutral-400">
            <div className="text-right">{scorers("A").join(", ")}</div>
            <div className="w-8" />
            <div className="text-left">{scorers("B").join(", ")}</div>
          </div>
        )}
        {mvp && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm text-gold">
            👑 MVP: <Avatar player={mvp} size={22} /> {playerName(mvp)}
          </div>
        )}
        {match.notes && <p className="mt-3 text-sm italic text-neutral-400">“{match.notes}”</p>}
      </Card>

      <div className="space-y-5">
        {match.status === "programmata" && <Availability match={match} />}

        {finished && !isAdmin && lineup.length > 0 && (
          <Card>
            <SectionTitle>Formazioni</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["A", "B"] as const).map((side) => (
                <div key={side}>
                  <div className="mb-1 font-display text-lg font-bold uppercase">{TEAM_NAMES[side]}</div>
                  <ul className="space-y-1 text-sm">
                    {roster(side).map(({ l, p }) => (
                      <li key={l.id} className="flex items-center gap-2"><Avatar player={p!} size={24} /> {playerName(p!)} {l.is_gk && <Badge tone="gold">POR</Badge>}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        )}

        {match.status !== "annullata" && !(finished && !isAdmin) && <TeamBuilder key={`${id}-${lineup.length}`} match={match} />}

        {isAdmin && (
          <>
            <ResultEditor key={`${match.id}-${match.status}-${match.score_a}-${match.score_b}`} match={match} />
            <div className="text-right"><Button variant="danger" onClick={remove}>Elimina partita</Button></div>
          </>
        )}
      </div>
    </>
  );
}
