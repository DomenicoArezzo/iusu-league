import type { MarketAdjustment, Match, Player } from "./types";
import type { MarketParams } from "./settings";
import { DEFAULT_MARKET } from "./settings";
import type { MatchLine, PlayerStats } from "./stats";

export interface ValuePoint {
  date: string;
  delta: number;
  value: number;
  label: string;
  matchId?: string;
}

export interface MarketEntry {
  playerId: string;
  initial: number;
  current: number;
  change: number;
  history: ValuePoint[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Variazione di valore per una singola presenza. */
export function matchDelta(line: MatchLine, p: MarketParams = DEFAULT_MARKET): number {
  let d = p.appearance;
  d += line.result === "W" ? p.win : line.result === "D" ? p.draw : p.loss;
  d += line.goals * p.goal + line.assists * p.assist;
  if (line.mvp) d += p.mvp;
  d += line.ownGoals * p.own_goal + line.yellows * p.yellow + line.reds * p.red;
  d += (line.rating - 6) * p.rating_factor;
  return round1(d);
}

/**
 * Valore di mercato di tutti i giocatori, calcolato sullo storico COMPLETO delle partite
 * confermate (passa le statistiche "all") più le correzioni manuali dell'admin.
 */
export function computeMarket(
  players: Player[],
  allStats: Record<string, PlayerStats>,
  adjustments: MarketAdjustment[],
  params: MarketParams = DEFAULT_MARKET,
): Record<string, MarketEntry> {
  const out: Record<string, MarketEntry> = {};
  for (const pl of players) {
    type Item = { date: string; delta: number; label: string; matchId?: string };
    const items: Item[] = [];
    for (const l of allStats[pl.id]?.lines ?? []) {
      items.push({ date: l.date, delta: matchDelta(l, params), label: "Partita", matchId: l.matchId });
    }
    for (const a of adjustments) {
      if (a.player_id === pl.id) {
        items.push({ date: a.created_at, delta: Number(a.delta), label: a.reason || "Correzione admin" });
      }
    }
    items.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());

    let value = Number(pl.initial_value);
    const history: ValuePoint[] = [];
    for (const it of items) {
      const next = Math.max(params.min_value, round1(value + it.delta));
      history.push({ date: it.date, delta: round1(next - value), value: next, label: it.label, matchId: it.matchId });
      value = next;
    }
    out[pl.id] = {
      playerId: pl.id,
      initial: Number(pl.initial_value),
      current: value,
      change: round1(value - Number(pl.initial_value)),
      history,
    };
  }
  return out;
}

/** Quanto è salito/sceso il valore nelle partite del periodo selezionato. */
export function gainInPeriod(entry: MarketEntry | undefined, matches: Match[]): number {
  if (!entry) return 0;
  const ids = new Set(matches.map((m) => m.id));
  return round1(entry.history.filter((h) => h.matchId && ids.has(h.matchId)).reduce((a, h) => a + h.delta, 0));
}
