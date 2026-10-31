import type { Player } from "./types";
import type { AlgoParams } from "./settings";
import { DEFAULT_ALGO } from "./settings";
import { computeOverall } from "./overall";
import type { PlayerStats } from "./stats";
import { recentForm } from "./stats";

export type Mode = "casuale" | "bilanciata" | "competitiva";
export type Side = "A" | "B" | "R";
export type Assignment = Record<string, Side>;

export interface TeamResult {
  assignment: Assignment;
  teamA: string[];
  teamB: string[];
  reserves: string[];
  strengthA: number;
  strengthB: number;
  /** differenza assoluta tra le due forze totali */
  diff: number;
  gkA: string | null;
  gkB: string | null;
}

export interface GenerateOptions {
  mode: Mode;
  players: Player[]; // i giocatori selezionati
  stats?: Record<string, PlayerStats>; // statistiche storiche (modalità competitiva)
  /** giocatori bloccati in una squadra (o in panchina con "R") */
  locked?: Record<string, Side>;
  algo?: AlgoParams;
  rng?: () => number;
  /** composizioni da NON riproporre (lista di id della squadra A) */
  avoid?: string[][];
  /** numero di titolari per squadra (default 5) */
  teamSize?: number;
}

/** Generatore pseudo-casuale con seed (per test ripetibili). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Forza di un giocatore usata dall'algoritmo, in scala overall (10-99). */
export function playerStrength(
  p: Player,
  mode: Mode,
  stats?: Record<string, PlayerStats>,
  algo: AlgoParams = DEFAULT_ALGO,
): number {
  const ovr = computeOverall(p);
  if (mode !== "competitiva") return ovr;
  const s = stats?.[p.id];
  if (!s || s.played < algo.min_matches) return ovr;
  const form = recentForm(s, algo.form_matches);
  const fw = Math.min(1, Math.max(0, algo.form_weight));
  const ww = Math.min(1 - fw, Math.max(0, algo.winrate_weight));
  const formScore = form == null ? ovr : form * 10; // voto 1-10 → 10-100
  const winScore = s.winPct; // 0-100
  return ovr * (1 - fw - ww) + formScore * fw + winScore * ww;
}

function combos<T>(items: T[], k: number): T[][] {
  const res: T[][] = [];
  const rec = (start: number, cur: T[]) => {
    if (cur.length === k) {
      res.push(cur.slice());
      return;
    }
    for (let i = start; i < items.length; i++) {
      cur.push(items[i]);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  if (k >= 0 && k <= items.length) rec(0, []);
  return res;
}

/** Scelta dei titolari quando i selezionati sono più di 2 × teamSize. */
function pickStarters(
  players: Player[],
  locked: Record<string, Side>,
  capacity: number,
  rng: () => number,
): { starters: Player[]; reserves: Player[] } {
  if (players.length <= capacity) return { starters: players, reserves: [] };
  const forcedReserve = players.filter((p) => locked[p.id] === "R");
  const forcedStarter = players.filter((p) => locked[p.id] === "A" || locked[p.id] === "B");
  const free = shuffle(
    players.filter((p) => !locked[p.id]),
    rng,
  );
  const room = Math.max(0, capacity - forcedStarter.length);
  const starters = [...forcedStarter, ...free.slice(0, room)];
  const reserves = [...forcedReserve, ...free.slice(room)];
  return { starters, reserves };
}

function summarize(
  assignment: Assignment,
  players: Player[],
  strength: (p: Player) => number,
): TeamResult {
  const byId = new Map(players.map((p) => [p.id, p]));
  const ids = (side: Side) => Object.entries(assignment).filter(([, s]) => s === side).map(([id]) => id);
  const teamA = ids("A");
  const teamB = ids("B");
  const reserves = ids("R");
  const sum = (list: string[]) => list.reduce((a, id) => a + (byId.get(id) ? strength(byId.get(id)!) : 0), 0);
  const strengthA = Math.round(sum(teamA) * 10) / 10;
  const strengthB = Math.round(sum(teamB) * 10) / 10;
  const gk = (list: string[]) =>
    list
      .map((id) => byId.get(id)!)
      .filter((p) => p && p.preferred_role === "portiere")
      .sort((x, y) => computeOverall(y) - computeOverall(x))[0]?.id ?? null;
  return {
    assignment,
    teamA,
    teamB,
    reserves,
    strengthA,
    strengthB,
    diff: Math.round(Math.abs(strengthA - strengthB) * 10) / 10,
    gkA: gk(teamA),
    gkB: gk(teamB),
  };
}

/** Ricalcola forze e differenza dopo una modifica manuale. */
export function evaluate(
  assignment: Assignment,
  players: Player[],
  mode: Mode = "bilanciata",
  stats?: Record<string, PlayerStats>,
  algo: AlgoParams = DEFAULT_ALGO,
): TeamResult {
  return summarize(assignment, players, (p) => playerStrength(p, mode, stats, algo));
}

/** Sposta (o scambia) un giocatore verso un'altra squadra / la panchina. */
export function movePlayer(assignment: Assignment, playerId: string, to: Side): Assignment {
  return { ...assignment, [playerId]: to };
}

/** Sostituzione: i due giocatori si scambiano il posto. */
export function swapPlayers(assignment: Assignment, a: string, b: string): Assignment {
  return { ...assignment, [a]: assignment[b], [b]: assignment[a] };
}

export function generateTeams(opts: GenerateOptions): TeamResult {
  const rng = opts.rng ?? Math.random;
  const algo = opts.algo ?? DEFAULT_ALGO;
  const size = opts.teamSize ?? 5;
  const locked = opts.locked ?? {};
  const strength = (p: Player) => playerStrength(p, opts.mode, opts.stats, algo);

  const { starters, reserves } = pickStarters(opts.players, locked, size * 2, rng);
  const n = starters.length;

  const assignment: Assignment = {};
  for (const r of reserves) assignment[r.id] = "R";

  if (n === 0) return summarize(assignment, opts.players, strength);

  const lockedA = starters.filter((p) => locked[p.id] === "A");
  const lockedB = starters.filter((p) => locked[p.id] === "B");
  const free = starters.filter((p) => !locked[p.id] || locked[p.id] === "R");

  // dimensioni ammesse per la squadra A (n dispari → due opzioni)
  const sizesA = n % 2 === 0 ? [n / 2] : [Math.floor(n / 2), Math.ceil(n / 2)];
  const validSizes = sizesA.filter((k) => k >= lockedA.length && n - k >= lockedB.length);
  const targetSizes = validSizes.length ? validSizes : [Math.max(lockedA.length, Math.min(n - lockedB.length, sizesA[0]))];

  // ---- modalità casuale
  if (opts.mode === "casuale") {
    const k = targetSizes[Math.floor(rng() * targetSizes.length)] - lockedA.length;
    const shuffled = shuffle(free, rng);
    const toA = new Set(shuffled.slice(0, Math.max(0, k)).map((p) => p.id));
    for (const p of lockedA) assignment[p.id] = "A";
    for (const p of lockedB) assignment[p.id] = "B";
    for (const p of free) assignment[p.id] = toA.has(p.id) ? "A" : "B";
    return summarize(assignment, opts.players, strength);
  }

  // ---- modalità bilanciata / competitiva: ricerca esaustiva (max C(10,5)=252 combinazioni)
  const top = new Set(
    starters
      .slice()
      .sort((x, y) => strength(y) - strength(x))
      .slice(0, 3)
      .map((p) => p.id),
  );
  const totalGk = starters.filter((p) => p.preferred_role === "portiere").length;
  const avoidKeys = new Set((opts.avoid ?? []).map((ids) => ids.slice().sort().join("|")));
  const allIds = starters.map((p) => p.id).sort();

  type Cand = { a: Player[]; b: Player[]; score: number };
  const cands: Cand[] = [];
  for (const sizeA of targetSizes) {
    for (const pick of combos(free, sizeA - lockedA.length)) {
      const pickIds = new Set(pick.map((p) => p.id));
      const a = [...lockedA, ...pick];
      const b = [...lockedB, ...free.filter((p) => !pickIds.has(p.id))];
      const sa = a.reduce((s, p) => s + strength(p), 0);
      const sb = b.reduce((s, p) => s + strength(p), 0);
      let score = Math.abs(sa - sb);
      const cnt = (list: Player[], role: Player["preferred_role"]) => list.filter((p) => p.preferred_role === role).length;
      for (const role of ["difensore", "centrocampista", "attaccante"] as const) {
        score += Math.abs(cnt(a, role) - cnt(b, role)) * 3;
      }
      if (totalGk >= 2) score += Math.abs(cnt(a, "portiere") - cnt(b, "portiere")) * 25;
      score += Math.abs(a.filter((p) => top.has(p.id)).length - b.filter((p) => top.has(p.id)).length) * 2;

      const keyA = a.map((p) => p.id).sort().join("|");
      const keyB = b.map((p) => p.id).sort().join("|");
      if (avoidKeys.has(keyA) || avoidKeys.has(keyB)) score += 1000;
      cands.push({ a, b, score });
    }
  }
  void allIds;
  cands.sort((x, y) => x.score - y.score);
  const best = cands[0];
  const tolerance = Math.max(0, algo.variety) * 2;
  const pool = cands.filter((c) => c.score <= best.score + tolerance + 1e-9 && c.score < 1000);
  const chosen = (pool.length ? pool : [best])[Math.floor(rng() * (pool.length || 1))];

  for (const p of chosen.a) assignment[p.id] = "A";
  for (const p of chosen.b) assignment[p.id] = "B";
  return summarize(assignment, opts.players, strength);
}
