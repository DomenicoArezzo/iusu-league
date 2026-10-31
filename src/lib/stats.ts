import type { Dataset, Match, MatchEvent, Player } from "./types";
import type { RatingParams } from "./settings";
import { DEFAULT_RATING } from "./settings";

export type Period =
  | { kind: "all" }
  | { kind: "season"; seasonId: string }
  | { kind: "month"; month: string } // "YYYY-MM"
  | { kind: "last"; n: number };

export interface MatchLine {
  matchId: string;
  date: string;
  team: "A" | "B";
  result: "W" | "D" | "L";
  goalsFor: number;
  goalsAgainst: number;
  goals: number;
  assists: number;
  ownGoals: number;
  yellows: number;
  reds: number;
  mvp: boolean;
  isGk: boolean;
  rating: number;
}

export interface PlayerStats {
  playerId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  ownGoals: number;
  mvps: number;
  yellows: number;
  reds: number;
  gkMatches: number;
  conceded: number; // gol subiti nelle partite giocate da portiere
  goalsPerGame: number;
  assistsPerGame: number;
  winPct: number; // 0-100
  avgRating: number;
  /** media "bayesiana": penalizza chi ha poche partite */
  adjRating: number;
  concededPerGame: number;
  lines: MatchLine[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Partite ufficiali: solo "conclusa" con risultato, in ordine cronologico. */
export function confirmedMatches(matches: Match[]): Match[] {
  return matches
    .filter((m) => m.status === "conclusa" && m.score_a != null && m.score_b != null)
    .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());
}

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Applica il filtro periodo a partite già confermate e ordinate. */
export function filterMatches(confirmed: Match[], period: Period): Match[] {
  switch (period.kind) {
    case "all":
      return confirmed;
    case "season":
      return confirmed.filter((m) => m.season_id === period.seasonId);
    case "month":
      return confirmed.filter((m) => monthKey(m.played_at) === period.month);
    case "last":
      return confirmed.slice(-period.n);
  }
}

export function matchRating(
  line: Omit<MatchLine, "rating">,
  p: RatingParams = DEFAULT_RATING,
): number {
  let r = p.base;
  r += line.goals * p.goal + line.assists * p.assist;
  r += line.result === "W" ? p.win : line.result === "D" ? p.draw : p.loss;
  if (line.mvp) r += p.mvp;
  r += line.ownGoals * p.own_goal + line.yellows * p.yellow + line.reds * p.red;
  if (line.isGk && line.goalsAgainst === 0) r += p.clean_sheet;
  return round2(Math.max(1, Math.min(10, r)));
}

/** Statistiche per giocatore sulle partite passate (già filtrate/confermate). */
export function computeStats(
  ds: Pick<Dataset, "players" | "matchPlayers" | "events">,
  matches: Match[],
  rating: RatingParams = DEFAULT_RATING,
  priorWeight = 3,
): Record<string, PlayerStats> {
  const out: Record<string, PlayerStats> = {};
  for (const p of ds.players) out[p.id] = emptyStats(p.id);

  const mpByMatch = new Map<string, typeof ds.matchPlayers>();
  for (const mp of ds.matchPlayers) {
    const arr = mpByMatch.get(mp.match_id) ?? [];
    arr.push(mp);
    mpByMatch.set(mp.match_id, arr);
  }
  const evByMatch = new Map<string, MatchEvent[]>();
  for (const e of ds.events) {
    const arr = evByMatch.get(e.match_id) ?? [];
    arr.push(e);
    evByMatch.set(e.match_id, arr);
  }

  for (const m of matches) {
    const sa = m.score_a ?? 0;
    const sb = m.score_b ?? 0;
    const evs = evByMatch.get(m.id) ?? [];
    for (const mp of mpByMatch.get(m.id) ?? []) {
      if (mp.team === "R") continue;
      const s = (out[mp.player_id] ??= emptyStats(mp.player_id));
      const mine = evs.filter((e) => e.player_id === mp.player_id);
      const gf = mp.team === "A" ? sa : sb;
      const ga = mp.team === "A" ? sb : sa;
      const base: Omit<MatchLine, "rating"> = {
        matchId: m.id,
        date: m.played_at,
        team: mp.team,
        result: gf > ga ? "W" : gf < ga ? "L" : "D",
        goalsFor: gf,
        goalsAgainst: ga,
        goals: mine.filter((e) => e.type === "goal").length,
        assists: mine.filter((e) => e.type === "assist").length,
        ownGoals: mine.filter((e) => e.type === "own_goal").length,
        yellows: mine.filter((e) => e.type === "yellow").length,
        reds: mine.filter((e) => e.type === "red").length,
        mvp: m.mvp_player_id === mp.player_id,
        isGk: mp.is_gk,
      };
      s.lines.push({ ...base, rating: matchRating(base, rating) });
    }
  }

  const priorRating = rating.base;
  for (const s of Object.values(out)) {
    s.lines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const l of s.lines) {
      s.played++;
      if (l.result === "W") s.wins++;
      else if (l.result === "D") s.draws++;
      else s.losses++;
      s.goals += l.goals;
      s.assists += l.assists;
      s.ownGoals += l.ownGoals;
      s.yellows += l.yellows;
      s.reds += l.reds;
      if (l.mvp) s.mvps++;
      if (l.isGk) {
        s.gkMatches++;
        s.conceded += l.goalsAgainst;
      }
    }
    const sum = s.lines.reduce((acc, l) => acc + l.rating, 0);
    s.goalsPerGame = s.played ? round2(s.goals / s.played) : 0;
    s.assistsPerGame = s.played ? round2(s.assists / s.played) : 0;
    s.winPct = s.played ? Math.round((s.wins / s.played) * 1000) / 10 : 0;
    s.avgRating = s.played ? round2(sum / s.played) : 0;
    s.adjRating = round2((sum + priorRating * priorWeight) / (s.played + priorWeight));
    s.concededPerGame = s.gkMatches ? round2(s.conceded / s.gkMatches) : 0;
  }
  return out;
}

function emptyStats(playerId: string): PlayerStats {
  return {
    playerId,
    played: 0, wins: 0, draws: 0, losses: 0,
    goals: 0, assists: 0, ownGoals: 0, mvps: 0, yellows: 0, reds: 0,
    gkMatches: 0, conceded: 0,
    goalsPerGame: 0, assistsPerGame: 0, winPct: 0,
    avgRating: 0, adjRating: 0, concededPerGame: 0,
    lines: [],
  };
}

/** Rendimento recente: media dei voti nelle ultime N presenze (null se nessuna). */
export function recentForm(s: PlayerStats | undefined, n: number): number | null {
  if (!s || s.lines.length === 0) return null;
  const last = s.lines.slice(-n);
  return last.reduce((a, l) => a + l.rating, 0) / last.length;
}

// ---------------------------------------------------------------- record

export interface Records {
  topGoalsInMatch: { playerId: string; matchId: string; goals: number } | null;
  biggestWin: { matchId: string; margin: number } | null;
  highestScoring: { matchId: string; total: number } | null;
  longestWinStreak: { playerId: string; length: number } | null;
  mostCards: { playerId: string; cards: number } | null;
}

export function computeRecords(stats: Record<string, PlayerStats>, matches: Match[]): Records {
  let topGoalsInMatch: Records["topGoalsInMatch"] = null;
  let longestWinStreak: Records["longestWinStreak"] = null;
  let mostCards: Records["mostCards"] = null;
  for (const s of Object.values(stats)) {
    let streak = 0;
    for (const l of s.lines) {
      if (l.goals > (topGoalsInMatch?.goals ?? 0)) {
        topGoalsInMatch = { playerId: s.playerId, matchId: l.matchId, goals: l.goals };
      }
      streak = l.result === "W" ? streak + 1 : 0;
      if (streak > (longestWinStreak?.length ?? 0)) {
        longestWinStreak = { playerId: s.playerId, length: streak };
      }
    }
    const cards = s.yellows + s.reds;
    if (cards > (mostCards?.cards ?? 0)) mostCards = { playerId: s.playerId, cards };
  }
  let biggestWin: Records["biggestWin"] = null;
  let highestScoring: Records["highestScoring"] = null;
  for (const m of matches) {
    const a = m.score_a ?? 0;
    const b = m.score_b ?? 0;
    const margin = Math.abs(a - b);
    if (margin > (biggestWin?.margin ?? 0)) biggestWin = { matchId: m.id, margin };
    if (a + b > (highestScoring?.total ?? 0)) highestScoring = { matchId: m.id, total: a + b };
  }
  return { topGoalsInMatch, biggestWin, highestScoring, longestWinStreak, mostCards };
}

// ---------------------------------------------------------------- coppie / head to head

export interface PairRecord {
  a: string;
  b: string;
  together: { played: number; wins: number; draws: number; losses: number };
  against: { played: number; aWins: number; bWins: number; draws: number };
}

const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

function emptyPair(a: string, b: string): PairRecord {
  const [x, y] = a < b ? [a, b] : [b, a];
  return {
    a: x,
    b: y,
    together: { played: 0, wins: 0, draws: 0, losses: 0 },
    against: { played: 0, aWins: 0, bWins: 0, draws: 0 },
  };
}

export function computePairs(
  ds: Pick<Dataset, "matchPlayers">,
  matches: Match[],
): Map<string, PairRecord> {
  const map = new Map<string, PairRecord>();
  const byMatch = new Map<string, typeof ds.matchPlayers>();
  for (const mp of ds.matchPlayers) {
    if (mp.team === "R") continue;
    const arr = byMatch.get(mp.match_id) ?? [];
    arr.push(mp);
    byMatch.set(mp.match_id, arr);
  }
  for (const m of matches) {
    const mps = byMatch.get(m.id) ?? [];
    const sa = m.score_a ?? 0;
    const sb = m.score_b ?? 0;
    for (let i = 0; i < mps.length; i++) {
      for (let j = i + 1; j < mps.length; j++) {
        const p = mps[i];
        const q = mps[j];
        const key = pairKey(p.player_id, q.player_id);
        const rec = map.get(key) ?? emptyPair(p.player_id, q.player_id);
        map.set(key, rec);
        if (p.team === q.team) {
          const mine = p.team === "A" ? sa : sb;
          const other = p.team === "A" ? sb : sa;
          rec.together.played++;
          if (mine > other) rec.together.wins++;
          else if (mine === other) rec.together.draws++;
          else rec.together.losses++;
        } else {
          rec.against.played++;
          if (sa === sb) rec.against.draws++;
          else {
            // chi ha vinto tra i due?
            const winnerTeam = sa > sb ? "A" : "B";
            const winnerId = p.team === winnerTeam ? p.player_id : q.player_id;
            if (winnerId === rec.a) rec.against.aWins++;
            else rec.against.bWins++;
          }
        }
      }
    }
  }
  return map;
}

export function pairOf(map: Map<string, PairRecord>, x: string, y: string): PairRecord {
  return map.get(pairKey(x, y)) ?? emptyPair(x, y);
}

export function playersById(players: Player[]): Record<string, Player> {
  return Object.fromEntries(players.map((p) => [p.id, p]));
}
