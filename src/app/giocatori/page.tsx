"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/app";
import { ROLE_LABEL, playerFullName, type PlayerRole } from "@/lib/types";
import { computeOverall } from "@/lib/overall";
import PlayerCard from "@/components/PlayerCard";
import PlayerForm from "@/components/PlayerForm";
import { Button, Empty, PageHeader } from "@/components/ui";

export default function PlayersPage() {
  const { players, isAdmin } = useApp();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<PlayerRole | "tutti">("tutti");
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);

  const list = useMemo(
    () =>
      players
        .filter((p) => (showAll ? true : p.status !== "inattivo"))
        .filter((p) => role === "tutti" || p.preferred_role === role)
        .filter((p) => `${playerFullName(p)} ${p.nickname ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => computeOverall(b) - computeOverall(a)),
    [players, q, role, showAll],
  );

  return (
    <>
      <PageHeader
        title="Giocatori"
        sub={`${players.length} in rosa`}
        right={isAdmin && <Button variant="primary" onClick={() => setAdding(true)}>+ Nuovo giocatore</Button>}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="w-full sm:w-64"><input placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="w-full sm:w-48">
          <select value={role} onChange={(e) => setRole(e.target.value as PlayerRole | "tutti")}>
            <option value="tutti">Tutti i ruoli</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Mostra inattivi
        </label>
      </div>

      {list.length === 0 ? (
        <Empty>{players.length === 0 ? (isAdmin ? "Nessun giocatore: aggiungi il primo con il pulsante in alto." : "L'admin non ha ancora inserito i giocatori.") : "Nessun risultato."}</Empty>
      ) : (
        <div className="grid grid-cols-2 justify-items-center gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((p) => <PlayerCard key={p.id} player={p} href={`/giocatori/${p.id}`} />)}
        </div>
      )}
      {adding && <PlayerForm open onClose={() => setAdding(false)} />}
    </>
  );
}
