"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/app";
import { getSupabase } from "@/lib/supabase";
import type { Match } from "@/lib/types";
import MatchRow from "@/components/MatchRow";
import { Button, Empty, Field, Modal, PageHeader } from "@/components/ui";

const PAGE = 12;

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(21, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const monthLabel = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { month: "long", year: "numeric" });

export default function MatchesPage() {
  const { matches, isAdmin, activeSeason, seasons, write } = useApp();
  const [adding, setAdding] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const [form, setForm] = useState({ played_at: defaultDate(), location: "Iusu", season_id: "" });

  const { upcoming, past } = useMemo(() => {
    const sorted = matches.slice().sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());
    const isOpen = (m: Match) => m.status === "programmata" || m.status === "in_corso";
    return { upcoming: sorted.filter(isOpen), past: sorted.filter((m) => !isOpen(m)).reverse() };
  }, [matches]);

  // Storico raggruppato per mese, mostrato a blocchi per non allungare troppo la pagina.
  const pastGroups = useMemo(() => {
    const groups: { label: string; items: Match[] }[] = [];
    for (const m of past.slice(0, visible)) {
      const label = monthLabel(m.played_at);
      const g = groups[groups.length - 1];
      if (g && g.label === label) g.items.push(m);
      else groups.push({ label, items: [m] });
    }
    return groups;
  }, [past, visible]);

  async function create() {
    const ok = await write(
      () =>
        getSupabase().from("matches").insert({
          played_at: new Date(form.played_at).toISOString(),
          location: form.location.trim() || "Iusu",
          season_id: form.season_id || activeSeason?.id || null,
        }),
      "Partita creata",
    );
    if (ok) setAdding(false);
  }

  return (
    <>
      <PageHeader
        title="Partite"
        sub={`${matches.length} in archivio`}
        right={isAdmin && <Button variant="primary" onClick={() => setAdding(true)}>+ Nuova partita</Button>}
      />

      <section aria-labelledby="da-giocare" className="mb-8">
        <h2 id="da-giocare" className="mb-2 font-display text-xl font-bold uppercase text-pitch">Da giocare <span className="text-sm text-neutral-400">({upcoming.length})</span></h2>
        <div className="space-y-2">
          {upcoming.length === 0 ? <Empty>{isAdmin ? "Nessuna partita in programma: creane una." : "Nessuna partita in programma."}</Empty> : upcoming.map((m) => <MatchRow key={m.id} m={m} />)}
        </div>
      </section>

      <section aria-labelledby="storico">
        <h2 id="storico" className="mb-2 font-display text-xl font-bold uppercase">Storico <span className="text-sm text-neutral-400">({past.length})</span></h2>
        {past.length === 0 ? (
          <Empty>Ancora nessuna partita giocata.</Empty>
        ) : (
          <div className="space-y-5">
            {pastGroups.map((g) => (
              <div key={g.label}>
                <h3 className="mb-2 text-sm font-semibold capitalize text-neutral-300">{g.label}</h3>
                <div className="space-y-2">{g.items.map((m) => <MatchRow key={m.id} m={m} />)}</div>
              </div>
            ))}
            {past.length > visible && (
              <div className="text-center">
                <Button onClick={() => setVisible((v) => v + PAGE)}>Mostra altre partite ({past.length - visible})</Button>
              </div>
            )}
          </div>
        )}
      </section>

      <Modal open={adding} onClose={() => setAdding(false)} title="Nuova partita">
        <div className="space-y-3">
          <Field label="Data e ora"><input type="datetime-local" value={form.played_at} onChange={(e) => setForm({ ...form, played_at: e.target.value })} /></Field>
          <Field label="Luogo"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Stagione">
            <select value={form.season_id} onChange={(e) => setForm({ ...form, season_id: e.target.value })}>
              <option value="">Stagione attiva{activeSeason ? ` (${activeSeason.name})` : ""}</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setAdding(false)}>Annulla</Button>
            <Button variant="primary" onClick={create}>Crea</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
