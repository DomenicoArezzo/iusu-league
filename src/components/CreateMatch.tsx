"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app";
import { getSupabase } from "@/lib/supabase";
import { COURT_OPTIONS, MAX_INFO, MAX_LOCATION, signupErrorMessage, validateNewMatch, type CourtOption } from "@/lib/signups";
import { Button, Field, Modal } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");

/** Data di domani in ora locale, nel formato di <input type="date">. */
function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const initial = () => ({ date: dayOffset(1), time: "21:00", court: "Iusu" as CourtOption, customCourt: "", info: "", seasonId: "" });

/** Form "Crea una partita". Serve il login: la creazione passa dalla funzione create_match del database. */
export default function CreateMatch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { isAdmin, seasons, activeSeason, refresh, toast } = useApp();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setForm(initial());
    setError(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validateNewMatch(form);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setBusy(true);
    const { data, error: err } = await getSupabase().rpc("create_match", {
      p_played_at: v.playedAt,
      p_location: v.location,
      p_info: v.info,
      p_season_id: isAdmin && form.seasonId ? form.seasonId : null,
    });
    setBusy(false);
    if (err) {
      setError(signupErrorMessage(err.message));
      return;
    }
    toast("Partita creata");
    await refresh();
    close();
    if (typeof data === "string") router.push(`/partite/${data}`);
  }

  return (
    <Modal open={open} onClose={close} title="Crea una partita">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data">
            <input type="date" required min={dayOffset(0)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Orario di inizio">
            <input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
        </div>

        <Field label="Campo da gioco">
          <select value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value as CourtOption })}>
            {COURT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {form.court === "Altro" && (
          <Field label="Nome del campo">
            <input
              required
              maxLength={MAX_LOCATION}
              autoComplete="off"
              placeholder="Scrivi il nome del campo"
              value={form.customCourt}
              onChange={(e) => setForm({ ...form, customCourt: e.target.value })}
            />
          </Field>
        )}

        <Field label="Informazioni aggiuntive (facoltative)" hint={`${form.info.length}/${MAX_INFO}`}>
          <textarea
            rows={3}
            maxLength={MAX_INFO}
            placeholder="Per esempio: portate le pettorine, si gioca anche con la pioggia…"
            value={form.info}
            onChange={(e) => setForm({ ...form, info: e.target.value })}
          />
        </Field>

        {isAdmin && (
          <Field label="Stagione">
            <select value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })}>
              <option value="">Stagione attiva{activeSeason ? ` (${activeSeason.name})` : ""}</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}

        <p className="text-sm text-neutral-400">Si gioca in 10: quando i posti finiscono la partita risulta completa.</p>

        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button onClick={close}>Annulla</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "Un attimo…" : "Crea partita"}</Button>
        </div>
      </form>
    </Modal>
  );
}
