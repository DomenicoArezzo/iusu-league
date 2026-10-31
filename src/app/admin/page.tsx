"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_ALGO, DEFAULT_RATING, SETTING_LABELS } from "@/lib/settings";
import { playerName } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, PageHeader, SectionTitle, Segmented, Spinner } from "@/components/ui";

type Tab = "utenti" | "stagioni" | "parametri" | "registro";

export default function AdminPage() {
  const { isAdmin, loading } = useApp();
  const [tab, setTab] = useState<Tab>("utenti");
  if (loading) return <Spinner />;
  if (!isAdmin) return <Empty>Area riservata all&apos;amministratore.</Empty>;
  return (
    <>
      <PageHeader title="Area admin" sub="Giocatori, partite e risultati si gestiscono dalle rispettive pagine." />
      <div className="mb-5">
        <Segmented value={tab} onChange={setTab} options={[
          { value: "utenti", label: "Utenti" },
          { value: "stagioni", label: "Stagioni" },
          { value: "parametri", label: "Parametri" },
          { value: "registro", label: "Registro" },
        ]} />
      </div>
      {tab === "utenti" && <Users />}
      {tab === "stagioni" && <Seasons />}
      {tab === "parametri" && <Params />}
      {tab === "registro" && <AuditLog />}
    </>
  );
}

function Users() {
  const { profiles, players, session, write } = useApp();
  const sb = getSupabase();
  const taken = new Set(profiles.map((p) => p.player_id).filter(Boolean));
  return (
    <Card>
      <SectionTitle>Utenti registrati</SectionTitle>
      <p className="mb-3 text-sm text-neutral-400">Collega ogni account al suo giocatore: così può dare la disponibilità. Chi ha il ruolo admin può modificare tutto.</p>
      <ul className="divide-y divide-ink-600">
        {profiles.map((u) => (
          <li key={u.id} className="grid items-center gap-2 py-3 sm:grid-cols-[1fr_200px_130px]">
            <div className="min-w-0">
              <div className="truncate font-semibold">{u.display_name || u.email}</div>
              <div className="truncate text-xs text-neutral-500">{u.email}</div>
            </div>
            <select value={u.player_id ?? ""} onChange={(e) => write(() => sb.from("profiles").update({ player_id: e.target.value || null }).eq("id", u.id), "Collegamento salvato")}>
              <option value="">Nessun giocatore</option>
              {players.filter((p) => !taken.has(p.id) || p.id === u.player_id).map((p) => <option key={p.id} value={p.id}>{playerName(p)}</option>)}
            </select>
            <select
              value={u.role}
              disabled={u.id === session?.user.id}
              title={u.id === session?.user.id ? "Non puoi cambiare il tuo ruolo" : undefined}
              onChange={(e) => write(() => sb.from("profiles").update({ role: e.target.value }).eq("id", u.id), "Ruolo aggiornato")}
            >
              <option value="member">Amico</option>
              <option value="admin">Admin</option>
            </select>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Seasons() {
  const { seasons, write } = useApp();
  const [name, setName] = useState("");
  const sb = getSupabase();

  async function startNew() {
    if (!name.trim()) return;
    if (!confirm("Iniziare una nuova stagione? Quella attuale resta nello storico con tutti i suoi dati.")) return;
    const today = new Date().toISOString().slice(0, 10);
    // prima chiude quella attiva (c'è un solo indice univoco sulla stagione attiva), poi crea la nuova
    const closed = await write(() => sb.from("seasons").update({ is_active: false, ends_on: today }).eq("is_active", true));
    if (!closed) return;
    const ok = await write(() => sb.from("seasons").insert({ name: name.trim(), starts_on: today, is_active: true }), "Nuova stagione iniziata");
    if (ok) setName("");
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <SectionTitle>Nuova stagione</SectionTitle>
        <Field label="Nome"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Stagione 2027/28" /></Field>
        <div className="mt-3"><Button variant="primary" onClick={startNew} disabled={!name.trim()}>Inizia nuova stagione</Button></div>
        <p className="mt-2 text-xs text-neutral-500">Le nuove partite vanno alla stagione attiva. Le classifiche e i premi delle stagioni passate restano consultabili.</p>
      </Card>
      <Card>
        <SectionTitle>Stagioni</SectionTitle>
        <ul className="divide-y divide-ink-600">
          {seasons.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-neutral-500">dal {s.starts_on}{s.ends_on ? ` al ${s.ends_on}` : ""}</div>
              </div>
              {s.is_active ? <Badge tone="green">Attiva</Badge> : (
                <Button small onClick={() => confirm(`Riattivare "${s.name}"? La stagione attiva verrà chiusa.`) && (async () => {
                  const ok = await write(() => sb.from("seasons").update({ is_active: false }).eq("is_active", true));
                  if (ok) await write(() => sb.from("seasons").update({ is_active: true, ends_on: null }).eq("id", s.id), "Stagione riattivata");
                })()}>Riattiva</Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function NumberGrid({ keys, values, onChange }: { keys: string[]; values: Record<string, number>; onChange: (k: string, v: number) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {keys.map((k) => (
        <Field key={k} label={SETTING_LABELS[k] ?? k}>
          <input type="number" step="0.1" value={values[k]} onChange={(e) => onChange(k, Number(e.target.value))} />
        </Field>
      ))}
    </div>
  );
}

function Params() {
  const { settings, write } = useApp();
  const [rating, setRating] = useState<Record<string, number>>({ ...settings.rating });
  const [algo, setAlgo] = useState<Record<string, number>>({ ...settings.algo });
  useEffect(() => { setRating({ ...settings.rating }); setAlgo({ ...settings.algo }); }, [settings]);
  const sb = getSupabase();
  const save = (key: string, value: Record<string, number>) =>
    write(() => sb.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" }), "Parametri salvati");

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle right={<Button small onClick={() => setRating({ ...DEFAULT_RATING })}>Ripristina</Button>}>Voto di rendimento</SectionTitle>
        <p className="mb-3 text-sm text-neutral-400">Il voto di una partita parte da un valore base e cambia con gol, assist, risultato, MVP e cartellini. Alimenta &ldquo;Miglior giocatore&rdquo; e il rendimento.</p>
        <NumberGrid keys={Object.keys(DEFAULT_RATING)} values={rating} onChange={(k, v) => setRating({ ...rating, [k]: v })} />
        <div className="mt-3"><Button variant="primary" onClick={() => save("rating", rating)}>Salva</Button></div>
      </Card>
      <Card>
        <SectionTitle right={<Button small onClick={() => setAlgo({ ...DEFAULT_ALGO })}>Ripristina</Button>}>Generatore squadre e classifiche</SectionTitle>
        <NumberGrid keys={Object.keys(DEFAULT_ALGO)} values={algo} onChange={(k, v) => setAlgo({ ...algo, [k]: v })} />
        <div className="mt-3"><Button variant="primary" onClick={() => save("algo", algo)}>Salva</Button></div>
      </Card>
      <p className="text-xs text-neutral-500">I parametri del mercato (gol, assist, MVP…) arrivano nella fase 2 insieme al Fantacalcio.</p>
    </div>
  );
}

interface LogRow { id: number; user_id: string | null; action: string; entity: string; entity_id: string | null; created_at: string; details: Record<string, unknown> | null }

function AuditLog() {
  const { profiles, players } = useApp();
  const [rows, setRows] = useState<LogRow[] | null>(null);
  useEffect(() => {
    getSupabase().from("audit_log").select("*").order("id", { ascending: false }).limit(150).then(({ data }) => setRows((data ?? []) as LogRow[]));
  }, []);
  if (!rows) return <Spinner />;
  const who = (id: string | null) => profiles.find((p) => p.id === id)?.display_name ?? "—";
  const label = (r: LogRow) => {
    const d = r.details ?? {};
    if (r.entity === "players") return playerName({ first_name: String(d.first_name ?? ""), last_name: String(d.last_name ?? ""), nickname: (d.nickname as string) ?? null });
    if (r.entity === "match_players" || r.entity === "match_events") {
      const p = players.find((x) => x.id === d.player_id);
      return p ? playerName(p) : "";
    }
    return String(d.name ?? d.status ?? "");
  };
  return (
    <Card>
      <SectionTitle>Ultime modifiche</SectionTitle>
      {rows.length === 0 ? <Empty>Nessuna modifica registrata.</Empty> : (
        <ul className="divide-y divide-ink-600 text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="w-36 shrink-0 text-xs text-neutral-500">{new Date(r.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</span>
              <Badge tone={r.action === "DELETE" ? "red" : r.action === "INSERT" ? "green" : "gold"}>{r.action === "INSERT" ? "nuovo" : r.action === "DELETE" ? "eliminato" : "modificato"}</Badge>
              <span className="font-semibold">{r.entity}</span>
              <span className="text-neutral-400">{label(r)}</span>
              <span className="ml-auto text-xs text-neutral-500">{who(r.user_id)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
