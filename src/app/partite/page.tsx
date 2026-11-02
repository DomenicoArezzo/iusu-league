"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app";
import type { Match } from "@/lib/types";
import CreateMatch from "@/components/CreateMatch";
import MatchRow from "@/components/MatchRow";
import { Button, Empty, Icon, PageHeader } from "@/components/ui";

const PAGE = 12;

const monthLabel = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { month: "long", year: "numeric" });

export default function MatchesPage() {
  const router = useRouter();
  const { matches, session, loading } = useApp();
  const [adding, setAdding] = useState(false);
  const [visible, setVisible] = useState(PAGE);

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

  // Chi non ha fatto login viene mandato ad accedere e poi riportato qui con il form già aperto (?nuova=1).
  useEffect(() => {
    if (loading || !session) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("nuova") === "1") {
      setAdding(true);
      url.searchParams.delete("nuova");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [loading, session]);

  function startCreate() {
    if (!session) {
      router.push(`/login?next=${encodeURIComponent("/partite?nuova=1")}`);
      return;
    }
    setAdding(true);
  }

  return (
    <>
      <PageHeader
        title="Partite"
        sub={`${matches.length} in archivio`}
        right={
          <Button variant="primary" className="w-full sm:w-auto" onClick={startCreate}>
            <Icon name="plus" size={18} /> Crea una partita
          </Button>
        }
      />

      <section aria-labelledby="da-giocare" className="mb-8">
        <h2 id="da-giocare" className="mb-2 font-display text-xl font-bold uppercase text-pitch">Da giocare <span className="text-sm text-neutral-400">({upcoming.length})</span></h2>
        <div className="space-y-2">
          {upcoming.length === 0 ? (
            <Empty>
              Nessuna partita in programma.{" "}
              <button type="button" onClick={startCreate} className="min-h-tap font-semibold text-pitch underline">Creane una</button>
            </Empty>
          ) : (
            upcoming.map((m) => <MatchRow key={m.id} m={m} />)
          )}
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

      <CreateMatch open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
