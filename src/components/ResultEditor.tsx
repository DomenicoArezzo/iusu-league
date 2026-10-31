"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/app";
import { toLocalInput } from "@/lib/derive";
import { getSupabase } from "@/lib/supabase";
import { STATUS_LABEL, TEAM_NAMES, playerName, type EventType, type Match, type MatchStatus } from "@/lib/types";
import { Badge, Button, Card, Field, SectionTitle } from "./ui";

const EVENT_LABEL: Record<EventType, string> = {
  goal: "⚽ Gol", assist: "🎯 Assist", own_goal: "🙈 Autogol", yellow: "🟨 Ammonizione", red: "🟥 Espulsione",
};

export default function ResultEditor({ match }: { match: Match }) {
  const { players, matchPlayers, events, write, toast } = useApp();
  const lineup = useMemo(() => matchPlayers.filter((mp) => mp.match_id === match.id && mp.team !== "R"), [matchPlayers, match.id]);
  const evs = useMemo(() => events.filter((e) => e.match_id === match.id), [events, match.id]);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const [info, setInfo] = useState({
    played_at: toLocalInput(match.played_at),
    location: match.location,
    duration_min: match.duration_min,
    notes: match.notes ?? "",
  });
  const [scoreA, setScoreA] = useState(match.score_a?.toString() ?? "");
  const [scoreB, setScoreB] = useState(match.score_b?.toString() ?? "");
  const [mvp, setMvp] = useState(match.mvp_player_id ?? "");
  const [ev, setEv] = useState<{ player: string; type: EventType; minute: string }>({ player: "", type: "goal", minute: "" });

  const teamOf = (pid: string) => lineup.find((l) => l.player_id === pid)?.team;
  const goalsFor = (side: "A" | "B") =>
    evs.filter((e) => e.type === "goal" && teamOf(e.player_id) === side).length +
    evs.filter((e) => e.type === "own_goal" && teamOf(e.player_id) && teamOf(e.player_id) !== side).length;
  const calcA = goalsFor("A");
  const calcB = goalsFor("B");
  const mismatch = scoreA !== "" && scoreB !== "" && (Number(scoreA) !== calcA || Number(scoreB) !== calcB) && evs.some((e) => e.type === "goal" || e.type === "own_goal");

  const sb = getSupabase();

  async function saveMatch(status?: MatchStatus) {
    const next = status ?? match.status;
    if (next === "conclusa") {
      if (scoreA === "" || scoreB === "") return toast("Inserisci il risultato prima di confermare.", "error");
      if (lineup.length === 0) return toast("Salva prima le formazioni.", "error");
    }
    const patch = {
      played_at: new Date(info.played_at).toISOString(),
      location: info.location.trim() || "Iusu",
      duration_min: info.duration_min,
      notes: info.notes.trim() || null,
      score_a: scoreA === "" ? null : Number(scoreA),
      score_b: scoreB === "" ? null : Number(scoreB),
      mvp_player_id: mvp || null,
      status: next,
    };
    await write(() => sb.from("matches").update(patch).eq("id", match.id), status === "conclusa" ? "Partita confermata: classifiche aggiornate" : "Partita salvata");
  }

  async function addEvent() {
    if (!ev.player) return toast("Scegli il giocatore.", "error");
    await write(
      () => sb.from("match_events").insert({ match_id: match.id, player_id: ev.player, type: ev.type, minute: ev.minute === "" ? null : Number(ev.minute) }),
    );
    setEv({ ...ev, minute: "" });
  }

  return (
    <Card>
      <SectionTitle right={<Badge tone={match.status === "conclusa" ? "green" : "gold"}>{STATUS_LABEL[match.status]}</Badge>}>Risultato e dettagli</SectionTitle>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Data e ora"><input type="datetime-local" value={info.played_at} onChange={(e) => setInfo({ ...info, played_at: e.target.value })} /></Field>
        <Field label="Luogo"><input value={info.location} onChange={(e) => setInfo({ ...info, location: e.target.value })} /></Field>
        <Field label="Durata (min)"><input type="number" min={10} value={info.duration_min} onChange={(e) => setInfo({ ...info, duration_min: Number(e.target.value) })} /></Field>
      </div>

      <div className="my-4 flex items-center justify-center gap-4 rounded-xl border border-ink-600 bg-ink-900 p-3">
        <div className="text-center">
          <div className="mb-1 text-xs uppercase text-neutral-500">{TEAM_NAMES.A}</div>
          <input className="!w-20 text-center font-display !text-3xl font-bold" type="number" min={0} value={scoreA} onChange={(e) => setScoreA(e.target.value)} />
        </div>
        <span className="font-display text-3xl text-neutral-500">–</span>
        <div className="text-center">
          <div className="mb-1 text-xs uppercase text-neutral-500">{TEAM_NAMES.B}</div>
          <input className="!w-20 text-center font-display !text-3xl font-bold" type="number" min={0} value={scoreB} onChange={(e) => setScoreB(e.target.value)} />
        </div>
      </div>
      {evs.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
          Dai marcatori risulta {calcA}–{calcB}.
          <Button small onClick={() => { setScoreA(String(calcA)); setScoreB(String(calcB)); }}>Usa questo risultato</Button>
        </div>
      )}
      {mismatch && <p className="mb-3 text-center text-xs text-gold">Il risultato non coincide con i marcatori inseriti: controlla prima di confermare.</p>}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="MVP">
          <select value={mvp} onChange={(e) => setMvp(e.target.value)}>
            <option value="">Nessuno</option>
            {lineup.map((l) => byId.get(l.player_id)).filter(Boolean).map((p) => <option key={p!.id} value={p!.id}>{playerName(p!)}</option>)}
          </select>
        </Field>
        <Field label="Note"><input value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} placeholder="Come è andata…" /></Field>
      </div>

      <div className="mb-4 rounded-xl border border-ink-600 p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Gol, assist e cartellini</div>
        {lineup.length === 0 ? (
          <p className="text-sm text-neutral-500">Salva prima le formazioni per inserire i marcatori.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_90px_auto]">
              <select value={ev.type} onChange={(e) => setEv({ ...ev, type: e.target.value as EventType })}>
                {Object.entries(EVENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={ev.player} onChange={(e) => setEv({ ...ev, player: e.target.value })}>
                <option value="">Giocatore…</option>
                {lineup.map((l) => byId.get(l.player_id)).filter(Boolean).map((p) => <option key={p!.id} value={p!.id}>{playerName(p!)}</option>)}
              </select>
              <input type="number" min={0} placeholder="Min." value={ev.minute} onChange={(e) => setEv({ ...ev, minute: e.target.value })} />
              <Button variant="primary" onClick={addEvent}>Aggiungi</Button>
            </div>
            {evs.length > 0 && (
              <ul className="mt-3 divide-y divide-ink-600 text-sm">
                {evs.slice().sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999)).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span>{e.minute != null && <span className="mr-2 text-neutral-500">{e.minute}&apos;</span>}{EVENT_LABEL[e.type]} — {byId.get(e.player_id) ? playerName(byId.get(e.player_id)!) : "?"} <span className="text-xs text-neutral-500">({TEAM_NAMES[teamOf(e.player_id) === "B" ? "B" : "A"]})</span></span>
                    <button className="text-neutral-500 hover:text-red-300" aria-label="Elimina" onClick={() => write(() => sb.from("match_events").delete().eq("id", e.id))}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(["programmata", "in_corso", "da_confermare", "annullata"] as MatchStatus[]).map((s) => (
            <Button key={s} small variant={match.status === s ? "gold" : "ghost"} onClick={() => saveMatch(s)}>{STATUS_LABEL[s]}</Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveMatch()}>Salva</Button>
          <Button variant="primary" onClick={() => saveMatch("conclusa")} disabled={match.status === "conclusa" && false}>
            {match.status === "conclusa" ? "Salva e mantieni confermata" : "Conferma ufficialmente"}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-500">Solo le partite confermate entrano nelle classifiche ufficiali. Se correggi una partita già confermata, le classifiche si ricalcolano da sole.</p>
    </Card>
  );
}
