"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/app";
import { getSupabase } from "@/lib/supabase";
import { playerName, type Match } from "@/lib/types";
import { Button, Card, SectionTitle } from "./ui";

type St = "yes" | "maybe" | "no";
const LABEL: Record<St, string> = { yes: "Ci sono", maybe: "Forse", no: "Non posso" };
const ICON: Record<St, string> = { yes: "✅", maybe: "❔", no: "⛔" };

export default function Availability({ match }: { match: Match }) {
  const { players, availability, profile, isAdmin, write } = useApp();
  const mine = profile?.player_id ?? null;
  const rows = useMemo(() => new Map(availability.filter((a) => a.match_id === match.id).map((a) => [a.player_id, a.status])), [availability, match.id]);
  const active = players.filter((p) => p.status !== "inattivo");
  const group = (s: St | undefined) => active.filter((p) => rows.get(p.id) === s);

  async function set(playerId: string, status: St) {
    await write(() =>
      getSupabase().from("availability").upsert(
        { match_id: match.id, player_id: playerId, status, updated_at: new Date().toISOString() },
        { onConflict: "match_id,player_id" },
      ),
    );
  }

  const open = match.status === "programmata";

  return (
    <Card>
      <SectionTitle>Disponibilità</SectionTitle>
      {open && mine && (
        <div className="mb-4 flex flex-wrap gap-2">
          {(["yes", "maybe", "no"] as St[]).map((s) => (
            <Button key={s} variant={rows.get(mine) === s ? "primary" : "ghost"} onClick={() => set(mine, s)}>
              {ICON[s]} {LABEL[s]}
            </Button>
          ))}
        </div>
      )}
      {open && !mine && !isAdmin && (
        <p className="mb-4 rounded-lg border border-ink-500 p-3 text-sm text-neutral-400">
          Il tuo account non è ancora collegato a un giocatore: chiedi all&apos;admin di collegarlo per poter dare la disponibilità.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {(["yes", "maybe", "no"] as St[]).map((s) => (
          <div key={s}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">{ICON[s]} {LABEL[s]} ({group(s).length})</div>
            <div className="flex flex-wrap gap-1">
              {group(s).map((p) => (
                <span key={p.id} className="rounded-full bg-ink-700 px-2.5 py-0.5 text-sm">{playerName(p)}</span>
              ))}
              {group(s).length === 0 && <span className="text-xs text-neutral-600">—</span>}
            </div>
          </div>
        ))}
      </div>
      {(() => {
        const silent = group(undefined);
        return silent.length > 0 ? (
          <div className="mt-4 border-t border-ink-600 pt-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Senza risposta ({silent.length})</div>
            <div className="flex flex-wrap gap-1">
              {silent.map((p) => (
                <span key={p.id} className="rounded-full border border-ink-600 px-2.5 py-0.5 text-sm text-neutral-400">
                  {playerName(p)}
                  {isAdmin && open && (
                    <button className="ml-1.5 text-pitch hover:underline" onClick={() => set(p.id, "yes")} title="Segna come presente">+</button>
                  )}
                </span>
              ))}
            </div>
          </div>
        ) : null;
      })()}
    </Card>
  );
}
