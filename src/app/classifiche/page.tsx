"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app";
import { useStats } from "@/lib/derive";
import { buildRankings } from "@/lib/rankings";
import { monthKey, type Period } from "@/lib/stats";
import { playerName } from "@/lib/types";
import { Avatar, Card, Empty, MEDAL, PageHeader, Segmented } from "@/components/ui";

type Kind = "season" | "month" | "last5" | "last10" | "all";

export default function RankingsPage() {
  const { players, seasons, activeSeason, settings } = useApp();
  const [kind, setKind] = useState<Kind>("season");
  const [seasonId, setSeasonId] = useState<string>("");
  const [month, setMonth] = useState<string>(monthKey(new Date().toISOString()));
  const [tab, setTab] = useState("best");

  const sid = seasonId || activeSeason?.id || seasons[0]?.id || "";
  const period: Period =
    kind === "all" ? { kind: "all" }
    : kind === "season" ? { kind: "season", seasonId: sid }
    : kind === "month" ? { kind: "month", month }
    : { kind: "last", n: kind === "last5" ? 5 : 10 };

  const { stats, matches, confirmed } = useStats(period);
  const rankings = useMemo(() => buildRankings(players, stats, settings.algo.min_matches), [players, stats, settings.algo.min_matches]);
  const current = rankings.find((r) => r.key === tab) ?? rankings[0];
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const months = useMemo(() => [...new Set(confirmed.map((m) => monthKey(m.played_at)))].sort().reverse(), [confirmed]);
  const monthLabel = (k: string) => new Date(`${k}-01T12:00:00`).toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Classifiche" sub={`${matches.length} partite ufficiali nel periodo`} />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "season", label: "Stagione" },
            { value: "month", label: "Mese" },
            { value: "last5", label: "Ultime 5" },
            { value: "last10", label: "Ultime 10" },
            { value: "all", label: "Storico" },
          ]}
        />
        {kind === "season" && (
          <div className="w-48">
            <select value={sid} onChange={(e) => setSeasonId(e.target.value)}>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {kind === "month" && months.length > 0 && (
          <div className="w-48">
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {!months.includes(month) && <option value={month}>{monthLabel(month)}</option>}
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-2">
        {rankings.map((r) => (
          <button
            key={r.key}
            onClick={() => setTab(r.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${current.key === r.key ? "border-pitch bg-pitch text-black" : "border-ink-500 text-neutral-300 hover:border-pitch/60"}`}
          >
            {r.title}
          </button>
        ))}
      </div>

      <Card>
        <div className="mb-3">
          <h2 className="font-display text-2xl font-bold uppercase">{current.title}</h2>
          <p className="text-sm text-neutral-400">{current.description}</p>
        </div>

        {current.rows.length === 0 ? (
          <Empty>Nessun dato per questo periodo.</Empty>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-3 items-end gap-2">
              {[1, 0, 2].map((i) => {
                const r = current.rows[i];
                const p = r && byId.get(r.playerId);
                if (!r || !p) return <div key={i} />;
                return (
                  <Link key={i} href={`/giocatori/${p.id}`} className="text-center">
                    <div className="mb-1 text-2xl">{MEDAL[i]}</div>
                    <div className="mx-auto w-fit"><Avatar player={p} size={i === 0 ? 64 : 52} /></div>
                    <div className="mt-1 truncate text-sm font-semibold">{playerName(p)}</div>
                    <div className={`mt-1 rounded-t-lg py-2 font-display text-2xl font-bold ${i === 0 ? "h-20 bg-gold/20 text-gold" : i === 1 ? "h-14 bg-white/10" : "h-10 bg-[#b0713f]/25 text-[#e2a87a]"}`}>{r.display}</div>
                  </Link>
                );
              })}
            </div>

            <ol className="divide-y divide-ink-600">
              {current.rows.map((r, i) => {
                const p = byId.get(r.playerId);
                if (!p) return null;
                return (
                  <li key={r.playerId}>
                    <Link href={`/giocatori/${p.id}`} className="flex items-center gap-3 py-2 hover:text-pitch">
                      <span className="w-7 text-center font-display text-lg font-bold text-neutral-500">{i < 3 ? MEDAL[i] : i + 1}</span>
                      <Avatar player={p} size={34} />
                      <span className="flex-1 truncate font-semibold">{playerName(p)}</span>
                      {r.sub && <span className="hidden text-xs text-neutral-500 sm:inline">{r.sub}</span>}
                      <span className="w-16 text-right font-display text-xl font-bold">{r.display}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </Card>
      <p className="mt-3 text-xs text-neutral-500">
        Contano solo le partite confermate. Le classifiche &ldquo;a media&rdquo; richiedono almeno {settings.algo.min_matches} partite.
      </p>
    </>
  );
}
