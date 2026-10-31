"use client";

import { useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/app";
import { useStats, fmtDate, fmtTime } from "@/lib/derive";
import { getSupabase } from "@/lib/supabase";
import { computeOverall } from "@/lib/overall";
import { evaluate, generateTeams, movePlayer, swapPlayers, type Assignment, type Mode, type Side } from "@/lib/teams";
import { ROLE_SHORT, TEAM_NAMES, playerName, type Match, type Player } from "@/lib/types";
import { Avatar, Badge, Button, Card, Empty, SectionTitle, Segmented } from "./ui";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "casuale", label: "Casuale", hint: "Sorteggio puro." },
  { value: "bilanciata", label: "Bilanciata", hint: "Stessa forza (overall), ruoli e portieri distribuiti." },
  { value: "competitiva", label: "Competitiva", hint: "Overall + rendimento recente + % vittorie." },
];

export function shareText(match: Match, players: Player[], a: string[], b: string[], r: string[]): string {
  const byId = new Map(players.map((p) => [p.id, p]));
  const names = (ids: string[]) => ids.map((id) => (byId.get(id) ? playerName(byId.get(id)!) : "?")).join(", ");
  const lines = [
    `⚽ IUSU LEAGUE — ${fmtDate(match.played_at)} ore ${fmtTime(match.played_at)} @ ${match.location}`,
    "",
    `⚪ ${TEAM_NAMES.A}: ${names(a)}`,
    `⚫ ${TEAM_NAMES.B}: ${names(b)}`,
  ];
  if (r.length) lines.push(`🪑 Panchina: ${names(r)}`);
  return lines.join("\n");
}

export default function TeamBuilder({ match }: { match: Match }) {
  const { players, matchPlayers, availability, settings, isAdmin, write, toast } = useApp();
  const { stats } = useStats();

  const saved = useMemo(() => matchPlayers.filter((mp) => mp.match_id === match.id), [matchPlayers, match.id]);
  const avail = useMemo(() => new Map(availability.filter((a) => a.match_id === match.id).map((a) => [a.player_id, a.status])), [availability, match.id]);
  const selectable = useMemo(() => players.filter((p) => p.status !== "inattivo"), [players]);

  const [pool, setPool] = useState<Set<string>>(() =>
    new Set(saved.length ? saved.map((s) => s.player_id) : selectable.filter((p) => avail.get(p.id) === "yes").map((p) => p.id)),
  );
  const [mode, setMode] = useState<Mode>("bilanciata");
  const [locked, setLocked] = useState<Record<string, Side>>({});
  const [assignment, setAssignment] = useState<Assignment | null>(
    saved.length ? Object.fromEntries(saved.map((s) => [s.player_id, s.team])) : null,
  );
  const [gks, setGks] = useState<Set<string>>(new Set(saved.filter((s) => s.is_gk).map((s) => s.player_id)));
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const history = useRef<string[][]>([]);

  const poolPlayers = useMemo(() => selectable.filter((p) => pool.has(p.id)), [selectable, pool]);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const result = useMemo(
    () => (assignment ? evaluate(assignment, players.filter((p) => assignment[p.id]), mode, stats, settings.algo) : null),
    [assignment, players, mode, stats, settings.algo],
  );

  function toggle(id: string) {
    setPool((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function generate() {
    if (poolPlayers.length < 2) return toast("Servono almeno 2 giocatori.", "error");
    const lk: Record<string, Side> = {};
    for (const [id, side] of Object.entries(locked)) if (pool.has(id)) lk[id] = side;
    const r = generateTeams({ mode, players: poolPlayers, stats, locked: lk, algo: settings.algo, avoid: history.current });
    history.current = [...history.current.slice(-20), r.teamA, r.teamB];
    setAssignment(r.assignment);
    setGks(new Set([r.gkA, r.gkB].filter((x): x is string => !!x)));
    setSwapFrom(null);
  }

  function move(id: string, to: Side) {
    if (!assignment) return;
    setAssignment(movePlayer(assignment, id, to));
    if (to === "R") setGks((g) => { const n = new Set(g); n.delete(id); return n; });
  }

  function doSwap(id: string) {
    if (!assignment) return;
    if (!swapFrom) return setSwapFrom(id);
    if (swapFrom === id) return setSwapFrom(null);
    setAssignment(swapPlayers(assignment, swapFrom, id));
    setGks((g) => {
      const n = new Set(g);
      n.delete(swapFrom);
      n.delete(id);
      return n;
    });
    setSwapFrom(null);
  }

  function lockCycle(id: string, side: Side | undefined) {
    setLocked((l) => {
      const n = { ...l };
      if (n[id] === side || !side) delete n[id];
      else n[id] = side;
      return n;
    });
  }

  async function save() {
    if (!result) return;
    setBusy(true);
    const sb = getSupabase();
    const rows = Object.entries(result.assignment).map(([player_id, team]) => ({
      match_id: match.id, player_id, team, is_gk: team !== "R" && gks.has(player_id),
    }));
    const del = await write(() => sb.from("match_players").delete().eq("match_id", match.id));
    const ok = del && (await write(() => sb.from("match_players").insert(rows), "Formazioni salvate"));
    setBusy(false);
    return ok;
  }

  function share() {
    if (!result) return;
    const text = shareText(match, players, result.teamA, result.teamB, result.reserves);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  const dirty = useMemo(() => {
    if (!assignment) return false;
    const a = JSON.stringify(Object.entries(assignment).sort());
    const b = JSON.stringify(saved.map((s) => [s.player_id, s.team]).sort());
    const g = JSON.stringify([...gks].sort());
    const sg = JSON.stringify(saved.filter((s) => s.is_gk).map((s) => s.player_id).sort());
    return a !== b || g !== sg;
  }, [assignment, saved, gks]);

  const column = (side: Side, ids: string[]) => (
    <div className="space-y-1.5">
      {ids.length === 0 && <div className="py-3 text-center text-xs text-neutral-500">vuota</div>}
      {ids
        .map((id) => byId.get(id)!)
        .filter(Boolean)
        .sort((a, b) => computeOverall(b) - computeOverall(a))
        .map((p) => {
          const isLocked = locked[p.id] === side;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                swapFrom === p.id ? "border-gold bg-gold/10" : "border-ink-600 bg-ink-900"
              }`}
            >
              <Avatar player={p} size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{playerName(p)}</div>
                <div className="text-[11px] text-neutral-500">{ROLE_SHORT[p.preferred_role]} · OVR {computeOverall(p)}</div>
              </div>
              {side !== "R" && (
                <button
                  title="Portiere"
                  onClick={() => setGks((g) => { const n = new Set(g); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${gks.has(p.id) ? "bg-gold text-black" : "bg-ink-600 text-neutral-400"}`}
                >
                  POR
                </button>
              )}
              <button title={isLocked ? "Sblocca" : "Blocca in questa squadra"} onClick={() => lockCycle(p.id, side)} className={`text-sm ${isLocked ? "" : "opacity-35 hover:opacity-100"}`}>
                🔒
              </button>
              <button title="Scambia con un altro" onClick={() => doSwap(p.id)} className="text-sm opacity-60 hover:opacity-100">⇄</button>
              <div className="flex flex-col gap-0.5 text-[10px] font-bold">
                {(["A", "B", "R"] as Side[]).filter((s) => s !== side).map((s) => (
                  <button key={s} onClick={() => move(p.id, s)} className="rounded bg-ink-600 px-1 text-neutral-300 hover:bg-pitch hover:text-black">
                    →{s === "R" ? "Pan" : s}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );

  const diffTone = !result ? "gray" : result.diff <= 8 ? "green" : result.diff <= 20 ? "gold" : "red";

  return (
    <Card>
      <SectionTitle right={result && <Button small onClick={share}>Condividi su WhatsApp</Button>}>Squadre</SectionTitle>

      <div className="mb-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Chi gioca ({pool.size}) {pool.size > 10 && <span className="text-gold">· {pool.size - 10} in panchina</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {selectable.map((p) => {
            const on = pool.has(p.id);
            const av = avail.get(p.id);
            const lk = locked[p.id];
            return (
              <div key={p.id} className={`flex items-center overflow-hidden rounded-full border text-sm ${on ? "border-pitch bg-pitch/10" : "border-ink-500 bg-ink-900 text-neutral-400"}`}>
                <button onClick={() => toggle(p.id)} className="flex items-center gap-1.5 py-1 pl-3 pr-2 font-medium">
                  {av === "yes" && <span title="Disponibile">✅</span>}
                  {av === "maybe" && <span title="Forse">❔</span>}
                  {av === "no" && <span title="Non c'è">⛔</span>}
                  {playerName(p)}
                </button>
                {on && (
                  <select
                    aria-label={`Vincolo per ${playerName(p)}`}
                    value={lk ?? ""}
                    onChange={(e) => lockCycle(p.id, (e.target.value || undefined) as Side | undefined)}
                    className="!w-auto !rounded-none !border-0 !border-l !border-ink-500 !bg-transparent !py-1 !pl-2 !pr-1 text-xs"
                  >
                    <option value="">libero</option>
                    <option value="A">🔒 {TEAM_NAMES.A}</option>
                    <option value="B">🔒 {TEAM_NAMES.B}</option>
                    <option value="R">🔒 panchina</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button small onClick={() => setPool(new Set(selectable.filter((p) => avail.get(p.id) === "yes").map((p) => p.id)))}>Solo chi ha detto sì</Button>
          <Button small onClick={() => setPool(new Set(selectable.filter((p) => avail.get(p.id) !== "no").map((p) => p.id)))}>Sì + forse + senza risposta</Button>
          <Button small onClick={() => setPool(new Set())}>Svuota</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m.value, label: m.label }))} />
        <Button variant="primary" onClick={generate}>{assignment ? "Genera nuove squadre" : "Genera squadre"}</Button>
      </div>
      <p className="mb-4 text-xs text-neutral-500">{MODES.find((m) => m.value === mode)?.hint} I giocatori con 🔒 restano dove li hai messi anche quando rigeneri.</p>

      {!result ? (
        <Empty>Scegli i giocatori e premi &ldquo;Genera squadre&rdquo;.</Empty>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-ink-600 bg-ink-900 p-3">
            <div className="text-center">
              <div className="text-xs uppercase text-neutral-500">{TEAM_NAMES.A}</div>
              <div className="font-display text-3xl font-bold">{result.strengthA}</div>
            </div>
            <Badge tone={diffTone}>differenza {result.diff}</Badge>
            <div className="text-center">
              <div className="text-xs uppercase text-neutral-500">{TEAM_NAMES.B}</div>
              <div className="font-display text-3xl font-bold">{result.strengthB}</div>
            </div>
          </div>
          {swapFrom && <p className="mb-2 text-center text-xs text-gold">Scegli con chi scambiare {playerName(byId.get(swapFrom)!)} (⇄)</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1.5 font-display text-lg font-bold uppercase">⚪ {TEAM_NAMES.A} <span className="text-sm text-neutral-500">({result.teamA.length})</span></div>
              {column("A", result.teamA)}
            </div>
            <div>
              <div className="mb-1.5 font-display text-lg font-bold uppercase">⚫ {TEAM_NAMES.B} <span className="text-sm text-neutral-500">({result.teamB.length})</span></div>
              {column("B", result.teamB)}
            </div>
          </div>
          {result.reserves.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 font-display text-lg font-bold uppercase">🪑 Panchina</div>
              {column("R", result.reserves)}
            </div>
          )}
          {isAdmin && (
            <div className="mt-4 flex items-center justify-end gap-3">
              {dirty ? <span className="text-xs text-gold">Modifiche non salvate</span> : saved.length > 0 && <span className="text-xs text-pitch">Formazioni salvate</span>}
              <Button variant="primary" disabled={busy || !dirty} onClick={save}>{busy ? "Salvo…" : "Salva formazioni"}</Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
