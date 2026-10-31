"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useApp } from "@/lib/app";
import { computeOverall, suggestedInitialValue } from "@/lib/overall";
import { ROLE_LABEL, SKILLS, SKILL_LABEL, type Player, type PlayerRole, type PlayerStatus } from "@/lib/types";
import { Button, Field, Modal } from "./ui";

type Draft = Omit<Player, "id" | "created_at">;

const EMPTY: Draft = {
  first_name: "", last_name: "", nickname: "", avatar_url: null, status: "attivo", preferred_role: "jolly",
  shooting: 5, passing: 5, dribbling: 5, pace: 5, defending: 5, physical: 5, technique: 5, vision: 5, saves: 5,
  initial_value: 25,
};

export default function PlayerForm({ open, onClose, player }: { open: boolean; onClose: () => void; player?: Player }) {
  const { write } = useApp();
  const [d, setD] = useState<Draft>(player ? { ...player, nickname: player.nickname ?? "" } : EMPTY);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const ovr = computeOverall(d);

  async function save() {
    if (!d.first_name.trim()) return;
    setBusy(true);
    const row = {
      ...d,
      first_name: d.first_name.trim(),
      last_name: d.last_name.trim(),
      nickname: d.nickname?.trim() || null,
      avatar_url: d.avatar_url?.trim() || null,
    };
    const sb = getSupabase();
    const ok = await write(
      () => (player ? sb.from("players").update(row).eq("id", player.id) : sb.from("players").insert(row)),
      player ? "Giocatore aggiornato" : "Giocatore aggiunto",
    );
    setBusy(false);
    if (ok) {
      if (!player) setD(EMPTY);
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={player ? "Modifica giocatore" : "Nuovo giocatore"}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome"><input value={d.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
          <Field label="Cognome"><input value={d.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
          <Field label="Nickname"><input value={d.nickname ?? ""} onChange={(e) => set("nickname", e.target.value)} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Ruolo preferito">
            <select value={d.preferred_role} onChange={(e) => set("preferred_role", e.target.value as PlayerRole)}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Stato">
            <select value={d.status} onChange={(e) => set("status", e.target.value as PlayerStatus)}>
              <option value="attivo">Attivo</option>
              <option value="inattivo">Inattivo</option>
              <option value="indisponibile">Indisponibile</option>
            </select>
          </Field>
          <Field label="Foto (link)"><input value={d.avatar_url ?? ""} placeholder="https://…" onChange={(e) => set("avatar_url", e.target.value)} /></Field>
        </div>

        <div className="rounded-xl border border-ink-600 bg-ink-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Valutazioni 1-10</span>
            <span className="font-display text-2xl font-bold text-pitch">OVR {ovr}</span>
          </div>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {SKILLS.map((s) => (
              <label key={s} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-neutral-300">{SKILL_LABEL[s]}</span>
                <input type="range" min={1} max={10} value={d[s]} onChange={(e) => set(s, Number(e.target.value))} />
                <span className="w-5 text-right font-display text-lg font-bold">{d[s]}</span>
              </label>
            ))}
          </div>
        </div>

        <Field label="Valore iniziale (crediti)" hint="Servirà con il mercato, nella fase 2.">
          <div className="flex gap-2">
            <input type="number" min={1} step={0.5} value={d.initial_value} onChange={(e) => set("initial_value", Number(e.target.value))} />
            <Button onClick={() => set("initial_value", suggestedInitialValue(ovr))}>Suggerisci</Button>
          </div>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Annulla</Button>
          <Button variant="primary" onClick={save} disabled={busy || !d.first_name.trim()}>
            {busy ? "Salvo…" : "Salva"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
