import type { Player } from "./types";
import { playerName } from "./types";
import type { PlayerStats } from "./stats";

export interface RankRow {
  playerId: string;
  value: number;
  display: string;
  sub?: string;
}

export interface RankingDef {
  key: string;
  title: string;
  description: string;
  rows: RankRow[];
}

interface Spec {
  key: string;
  title: string;
  description: string;
  /** valore da ordinare */
  value: (s: PlayerStats) => number;
  dir: "desc" | "asc";
  /** minimo di partite per comparire */
  min?: (s: PlayerStats, minMatches: number) => boolean;
  display: (s: PlayerStats) => string;
  sub?: (s: PlayerStats) => string;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const SPECS: Spec[] = [
  {
    key: "best",
    title: "Miglior giocatore",
    description: "Voto medio di rendimento, corretto per chi ha poche partite",
    value: (s) => s.adjRating,
    dir: "desc",
    min: (s, m) => s.played >= m,
    display: (s) => s.adjRating.toFixed(2),
    sub: (s) => `${s.played} partite`,
  },
  {
    key: "scorers",
    title: "Capocannoniere",
    description: "Gol segnati",
    value: (s) => s.goals,
    dir: "desc",
    min: (s) => s.played > 0,
    display: (s) => String(s.goals),
    sub: (s) => `${fmt(s.goalsPerGame)} a partita`,
  },
  {
    key: "assists",
    title: "Miglior assistman",
    description: "Assist forniti",
    value: (s) => s.assists,
    dir: "desc",
    min: (s) => s.played > 0,
    display: (s) => String(s.assists),
    sub: (s) => `${fmt(s.assistsPerGame)} a partita`,
  },
  {
    key: "mvps",
    title: "Re degli MVP",
    description: "Premi MVP conquistati",
    value: (s) => s.mvps,
    dir: "desc",
    min: (s) => s.played > 0,
    display: (s) => String(s.mvps),
    sub: (s) => `${s.played} partite`,
  },
  {
    key: "wins",
    title: "Più vittorie",
    description: "Numero di vittorie",
    value: (s) => s.wins,
    dir: "desc",
    min: (s) => s.played > 0,
    display: (s) => String(s.wins),
    sub: (s) => `${s.played} partite`,
  },
  {
    key: "winpct",
    title: "% vittorie",
    description: "Percentuale di vittorie (partite minime richieste)",
    value: (s) => s.winPct,
    dir: "desc",
    min: (s, m) => s.played >= m,
    display: (s) => `${s.winPct}%`,
    sub: (s) => `${s.wins}V ${s.draws}N ${s.losses}P`,
  },
  {
    key: "rating",
    title: "Rendimento medio",
    description: "Media dei voti di rendimento (partite minime richieste)",
    value: (s) => s.avgRating,
    dir: "desc",
    min: (s, m) => s.played >= m,
    display: (s) => s.avgRating.toFixed(2),
    sub: (s) => `${s.played} partite`,
  },
  {
    key: "keeper",
    title: "Miglior portiere",
    description: "Meno gol subiti a partita giocando in porta",
    value: (s) => s.concededPerGame,
    dir: "asc",
    min: (s, m) => s.gkMatches >= Math.max(1, Math.min(m, 3)),
    display: (s) => s.concededPerGame.toFixed(2),
    sub: (s) => `${s.gkMatches} in porta`,
  },
  {
    key: "presences",
    title: "Più presente",
    description: "Partite giocate",
    value: (s) => s.played,
    dir: "desc",
    min: (s) => s.played > 0,
    display: (s) => String(s.played),
  },
];

export const RANKING_KEYS = SPECS.map((s) => s.key);

export function buildRankings(
  players: Player[],
  stats: Record<string, PlayerStats>,
  minMatches: number,
): RankingDef[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  return SPECS.map((spec) => {
    const rows = players
      .map((p) => stats[p.id])
      .filter((s): s is PlayerStats => !!s && byId.has(s.playerId) && (spec.min ? spec.min(s, minMatches) : true))
      .sort((a, b) => {
        const d = spec.dir === "desc" ? spec.value(b) - spec.value(a) : spec.value(a) - spec.value(b);
        if (d !== 0) return d;
        // spareggio: più partite, poi rendimento, poi nome
        if (b.played !== a.played) return b.played - a.played;
        if (b.adjRating !== a.adjRating) return b.adjRating - a.adjRating;
        return playerName(byId.get(a.playerId)!).localeCompare(playerName(byId.get(b.playerId)!));
      })
      .map<RankRow>((s) => ({
        playerId: s.playerId,
        value: spec.value(s),
        display: spec.display(s),
        sub: spec.sub?.(s),
      }));
    return { key: spec.key, title: spec.title, description: spec.description, rows };
  });
}
