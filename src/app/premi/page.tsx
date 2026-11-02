"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app";
import { useStats } from "@/lib/derive";
import { computeAwards } from "@/lib/awards";
import { computeMarket } from "@/lib/market";
import { computeStats, confirmedMatches, filterMatches } from "@/lib/stats";
import { getSupabase } from "@/lib/supabase";
import { playerName } from "@/lib/types";
import { Avatar, Card, Empty, PageHeader, SectionTitle } from "@/components/ui";

export default function AwardsPage() {
  const { players, matches, matchPlayers, events, seasons, activeSeason, manualAwards, adjustments, settings, isAdmin, write } = useApp();
  const [seasonId, setSeasonId] = useState("");
  const sid = seasonId || activeSeason?.id || seasons[0]?.id || "";
  const { stats: allStats } = useStats();

  const confirmed = useMemo(() => confirmedMatches(matches), [matches]);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const seasonStats = useMemo(
    () => computeStats({ players, matchPlayers, events }, filterMatches(confirmed, { kind: "season", seasonId: sid }), settings.rating),
    [players, matchPlayers, events, confirmed, sid, settings.rating],
  );
  const market = useMemo(() => computeMarket(players, allStats, adjustments, settings.market), [players, allStats, adjustments, settings.market]);
  const manual = manualAwards.filter((m) => m.season_id === sid);
  const awards = useMemo(() => computeAwards(players, seasonStats, market, manual, settings.algo.min_matches), [players, seasonStats, market, manual, settings.algo.min_matches]);

  // Hall of Fame: Pallone d'Oro di ogni stagione che ha partite
  const hall = useMemo(() => {
    return seasons
      .map((s) => {
        const ms = filterMatches(confirmed, { kind: "season", seasonId: s.id });
        if (ms.length === 0) return null;
        const st = computeStats({ players, matchPlayers, events }, ms, settings.rating);
        const aw = computeAwards(players, st, market, manualAwards.filter((m) => m.season_id === s.id), settings.algo.min_matches);
        const pick = (key: string) => aw.find((a) => a.def.key === key);
        return { season: s, matches: ms.length, gold: pick("pallone_oro"), scorer: pick("capocannoniere") };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [seasons, confirmed, players, matchPlayers, events, settings, market, manualAwards]);

  async function setManual(key: string, playerId: string) {
    const sb = getSupabase();
    if (!playerId) {
      await write(() => sb.from("manual_awards").delete().eq("season_id", sid).eq("award_key", key), "Premio rimosso");
      return;
    }
    await write(() => sb.from("manual_awards").upsert({ season_id: sid, award_key: key, player_id: playerId }, { onConflict: "season_id,award_key" }), "Premio assegnato");
  }

  return (
    <>
      <PageHeader
        title="Premi"
        sub="Assegnati in base ai risultati confermati"
        right={<div className="w-full sm:w-52"><select aria-label="Stagione" value={sid} onChange={(e) => setSeasonId(e.target.value)}>{seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {awards.map(({ def, playerId, detail, note }) => {
          const p = playerId ? byId.get(playerId) : null;
          return (
            <Card key={def.key} className={def.funny ? "border-dashed" : ""}>
              <div className="flex items-start gap-3">
                <div className="text-3xl" aria-hidden="true">{def.icon}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-bold uppercase leading-tight text-gold">{def.title}</h3>
                  <div className="text-xs text-neutral-400">{def.description}</div>
                  {p ? (
                    <Link href={`/giocatori/${p.id}`} className="mt-2 flex min-h-tap items-center gap-2 hover:text-pitch">
                      <Avatar player={p} size={30} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{playerName(p)}</div>
                        {(detail || note) && <div className="truncate text-xs text-neutral-400">{detail ?? note}</div>}
                      </div>
                    </Link>
                  ) : (
                    <div className="mt-2 text-sm text-neutral-400">{def.auto ? "Non ancora assegnato" : "Da assegnare"}</div>
                  )}
                  {isAdmin && !def.auto && (
                    <select aria-label={`Assegna il premio ${def.title}`} className="mt-2 !py-1 text-sm" value={playerId ?? ""} onChange={(e) => setManual(def.key, e.target.value)}>
                      <option value="">— nessuno —</option>
                      {players.map((pl) => <option key={pl.id} value={pl.id}>{playerName(pl)}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <SectionTitle>Hall of Fame</SectionTitle>
        {hall.length === 0 ? (
          <Empty>Qui finiranno i vincitori di ogni stagione.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {hall.map(({ season, matches: n, gold, scorer }) => {
              const g = gold?.playerId ? byId.get(gold.playerId) : null;
              const s = scorer?.playerId ? byId.get(scorer.playerId) : null;
              return (
                <Card key={season.id}>
                  <div className="font-display text-xl font-bold uppercase">{season.name} <span className="text-sm text-neutral-500">· {n} partite</span></div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>🏆 Pallone d&apos;Oro: <b>{g ? playerName(g) : "–"}</b></div>
                    <div>⚽ Capocannoniere: <b>{s ? playerName(s) : "–"}</b> {scorer?.detail && <span className="text-neutral-500">({scorer.detail})</span>}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
