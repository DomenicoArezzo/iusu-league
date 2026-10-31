"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app";
import { useStats, fmtDate } from "@/lib/derive";
import { computePairs, pairOf } from "@/lib/stats";
import { ROLE_LABEL, SKILLS, SKILL_LABEL, TEAM_NAMES, playerFullName, playerName } from "@/lib/types";
import { computeOverall } from "@/lib/overall";
import { getSupabase } from "@/lib/supabase";
import PlayerCard from "@/components/PlayerCard";
import PlayerForm from "@/components/PlayerForm";
import { RatingChart, SkillBar } from "@/components/Charts";
import { Badge, Button, Card, Empty, SectionTitle, Spinner, Stat } from "@/components/ui";

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { players, matchPlayers, isAdmin, write, matches } = useApp();
  const { stats, confirmed } = useStats();
  const [editing, setEditing] = useState(false);
  const [other, setOther] = useState("");

  const player = players.find((p) => p.id === id);
  const s = stats[id];
  const pairs = useMemo(() => computePairs({ matchPlayers }, confirmed), [matchPlayers, confirmed]);

  if (!player) return <Spinner label="Giocatore non trovato." />;

  const pr = other ? pairOf(pairs, id, other) : null;
  const rival = players.find((p) => p.id === other);
  const iAmA = pr ? pr.a === id : true;
  const matchById = new Map(matches.map((m) => [m.id, m]));

  async function remove() {
    if (!confirm(`Eliminare ${playerFullName(player!)}? Sparirà anche dalle partite giocate.`)) return;
    const ok = await write(() => getSupabase().from("players").delete().eq("id", id), "Giocatore eliminato");
    if (ok) router.replace("/giocatori");
  }

  return (
    <>
      <Link href="/giocatori" className="mb-4 inline-block text-sm text-neutral-400 hover:text-white">← Tutti i giocatori</Link>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="flex flex-col items-center gap-4">
          <PlayerCard player={player} size="lg" />
          <div className="text-center">
            <div className="font-display text-2xl font-bold uppercase">{playerFullName(player)}</div>
            <div className="mt-1 flex justify-center gap-2">
              <Badge tone="green">{ROLE_LABEL[player.preferred_role]}</Badge>
              <Badge tone={player.status === "attivo" ? "gray" : "red"}>{player.status}</Badge>
            </div>
            <div className="mt-1 text-xs text-neutral-500">In lega dal {fmtDate(player.created_at, { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button onClick={() => setEditing(true)}>Modifica</Button>
              <Button variant="danger" onClick={remove}>Elimina</Button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle>Statistiche</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Partite" value={s?.played ?? 0} />
              <Stat label="V / N / P" value={`${s?.wins ?? 0}/${s?.draws ?? 0}/${s?.losses ?? 0}`} />
              <Stat label="% vittorie" value={`${s?.winPct ?? 0}%`} tone="green" />
              <Stat label="Rendimento" value={s?.played ? s.avgRating.toFixed(2) : "–"} tone="gold" />
              <Stat label="Gol" value={s?.goals ?? 0} />
              <Stat label="Assist" value={s?.assists ?? 0} />
              <Stat label="MVP" value={s?.mvps ?? 0} tone="gold" />
              <Stat label="Autogol" value={s?.ownGoals ?? 0} />
              <Stat label="Gol / partita" value={s?.goalsPerGame ?? 0} />
              <Stat label="Assist / partita" value={s?.assistsPerGame ?? 0} />
              <Stat label="Ammonizioni" value={s?.yellows ?? 0} />
              <Stat label="Espulsioni" value={s?.reds ?? 0} />
            </div>
            {(s?.gkMatches ?? 0) > 0 && (
              <p className="mt-3 text-sm text-neutral-400">In porta: {s!.gkMatches} partite, {s!.concededPerGame.toFixed(2)} gol subiti a partita.</p>
            )}
          </Card>

          <Card>
            <SectionTitle>Andamento</SectionTitle>
            <RatingChart points={(s?.lines ?? []).map((l) => ({ label: fmtDate(l.date), value: l.rating }))} />
          </Card>

          <Card>
            <SectionTitle right={<span className="font-display text-2xl font-bold text-pitch">OVR {computeOverall(player)}</span>}>Caratteristiche</SectionTitle>
            <div className="space-y-2">
              {SKILLS.filter((k) => player.preferred_role === "portiere" || k !== "saves").map((k) => (
                <SkillBar key={k} label={SKILL_LABEL[k]} value={player[k]} />
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Confronto diretto</SectionTitle>
            <select value={other} onChange={(e) => setOther(e.target.value)}>
              <option value="">Scegli un altro giocatore…</option>
              {players.filter((p) => p.id !== id).map((p) => <option key={p.id} value={p.id}>{playerName(p)}</option>)}
            </select>
            {pr && rival && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-600 bg-ink-900 p-3">
                  <div className="text-xs uppercase text-neutral-500">Nella stessa squadra</div>
                  <div className="font-display text-2xl font-bold">{pr.together.played} partite</div>
                  <div className="text-sm text-neutral-400">{pr.together.wins}V {pr.together.draws}N {pr.together.losses}P</div>
                </div>
                <div className="rounded-xl border border-ink-600 bg-ink-900 p-3">
                  <div className="text-xs uppercase text-neutral-500">Uno contro l&apos;altro</div>
                  <div className="font-display text-2xl font-bold">
                    <span className="text-pitch">{iAmA ? pr.against.aWins : pr.against.bWins}</span> – {pr.against.draws} –{" "}
                    <span className="text-gold">{iAmA ? pr.against.bWins : pr.against.aWins}</span>
                  </div>
                  <div className="text-sm text-neutral-400">{playerName(player)} · pari · {playerName(rival)} ({pr.against.played} sfide)</div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>Ultime partite</SectionTitle>
            {!s || s.lines.length === 0 ? (
              <Empty>Nessuna partita ufficiale.</Empty>
            ) : (
              <ul className="divide-y divide-ink-600">
                {s.lines.slice().reverse().slice(0, 8).map((l) => {
                  const m = matchById.get(l.matchId);
                  return (
                    <li key={l.matchId}>
                      <Link href={`/partite/${l.matchId}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-pitch">
                        <span className="flex items-center gap-2">
                          <Badge tone={l.result === "W" ? "green" : l.result === "L" ? "red" : "gray"}>{l.result === "W" ? "V" : l.result === "L" ? "P" : "N"}</Badge>
                          {fmtDate(l.date)} · {m ? `${m.score_a}–${m.score_b}` : ""} · {TEAM_NAMES[l.team]}
                        </span>
                        <span className="text-neutral-400">
                          {l.goals > 0 && `⚽${l.goals} `}{l.assists > 0 && `🎯${l.assists} `}{l.mvp && "👑 "}
                          <span className="font-display text-lg font-bold text-white">{l.rating.toFixed(1)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {editing && <PlayerForm open onClose={() => setEditing(false)} player={player} />}
    </>
  );
}
