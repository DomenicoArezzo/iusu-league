import { describe, expect, it } from "vitest";
import { computeOverall } from "./overall";
import { evaluate, generateTeams, mulberry32, swapPlayers } from "./teams";
import { computeStats, confirmedMatches, filterMatches, computePairs } from "./stats";
import { buildRankings } from "./rankings";
import { mergeSettings, DEFAULT_SETTINGS } from "./settings";
import type { Match, MatchEvent, MatchPlayer, Player, PlayerRole } from "./types";

function mk(i: number, role: PlayerRole = "jolly", level = 5): Player {
  return {
    id: `p${i}`, first_name: `P${i}`, last_name: "", nickname: null, avatar_url: null, status: "attivo",
    preferred_role: role, shooting: level, passing: level, dribbling: level, pace: level, defending: level,
    physical: level, technique: level, vision: level, saves: level, initial_value: 25, created_at: "2026-09-01",
  };
}

const ten = [9, 8, 7, 7, 6, 6, 5, 4, 3, 3].map((lv, i) => mk(i, "jolly", lv));

describe("overall", () => {
  it("scala 1-10 -> 10-99 e pesa il ruolo", () => {
    expect(computeOverall(mk(1, "jolly", 10))).toBe(99);
    expect(computeOverall(mk(1, "jolly", 1))).toBe(10);
    const striker = { ...mk(2, "attaccante", 5), shooting: 10 };
    const defender = { ...mk(3, "difensore", 5), shooting: 10 };
    expect(computeOverall(striker)).toBeGreaterThan(computeOverall(defender));
  });
});

describe("generatore squadre", () => {
  it("10 giocatori -> 5 contro 5, nessuno ripetuto", () => {
    const r = generateTeams({ mode: "bilanciata", players: ten, rng: mulberry32(1) });
    expect(r.teamA).toHaveLength(5);
    expect(r.teamB).toHaveLength(5);
    expect(new Set([...r.teamA, ...r.teamB]).size).toBe(10);
  });

  it("bilanciata batte la differenza media del sorteggio", () => {
    const rng = mulberry32(7);
    let bal = 0;
    let rnd = 0;
    for (let i = 0; i < 30; i++) {
      bal += generateTeams({ mode: "bilanciata", players: ten, rng }).diff;
      rnd += generateTeams({ mode: "casuale", players: ten, rng }).diff;
    }
    expect(bal).toBeLessThan(rnd);
  });

  it("i più forti non finiscono nella stessa squadra", () => {
    const r = generateTeams({ mode: "bilanciata", players: ten, rng: mulberry32(3) });
    const top3 = ["p0", "p1", "p2"];
    const inA = top3.filter((id) => r.teamA.includes(id)).length;
    expect(inA).toBeGreaterThanOrEqual(1);
    expect(inA).toBeLessThanOrEqual(2);
  });

  it("separa i due portieri", () => {
    const ps = ten.map((p, i) => (i === 0 || i === 1 ? { ...p, preferred_role: "portiere" as const } : p));
    for (let s = 0; s < 10; s++) {
      const r = generateTeams({ mode: "bilanciata", players: ps, rng: mulberry32(s) });
      expect(r.gkA).not.toBeNull();
      expect(r.gkB).not.toBeNull();
    }
  });

  it("rispetta i giocatori bloccati anche rigenerando", () => {
    for (let s = 0; s < 10; s++) {
      const r = generateTeams({ mode: "bilanciata", players: ten, locked: { p0: "A", p1: "A", p9: "B" }, rng: mulberry32(s) });
      expect(r.teamA).toEqual(expect.arrayContaining(["p0", "p1"]));
      expect(r.teamB).toContain("p9");
      const c = generateTeams({ mode: "casuale", players: ten, locked: { p0: "A", p1: "A", p9: "B" }, rng: mulberry32(s) });
      expect(c.teamA).toEqual(expect.arrayContaining(["p0", "p1"]));
      expect(c.teamB).toContain("p9");
    }
  });

  it("oltre 10 giocatori crea le riserve e rispetta la panchina bloccata", () => {
    const twelve = [...ten, mk(10, "jolly", 6), mk(11, "jolly", 5)];
    const r = generateTeams({ mode: "bilanciata", players: twelve, locked: { p0: "R" }, rng: mulberry32(2) });
    expect(r.teamA).toHaveLength(5);
    expect(r.teamB).toHaveLength(5);
    expect(r.reserves).toHaveLength(2);
    expect(r.reserves).toContain("p0");
  });

  it("con meno di 10 giocatori divide in modo equo", () => {
    const r = generateTeams({ mode: "bilanciata", players: ten.slice(0, 8), rng: mulberry32(2) });
    expect(r.teamA).toHaveLength(4);
    expect(r.teamB).toHaveLength(4);
    const odd = generateTeams({ mode: "bilanciata", players: ten.slice(0, 7), rng: mulberry32(2) });
    expect(Math.abs(odd.teamA.length - odd.teamB.length)).toBe(1);
  });

  it("rigenerando evita la composizione precedente", () => {
    const first = generateTeams({ mode: "bilanciata", players: ten, rng: mulberry32(5) });
    const second = generateTeams({ mode: "bilanciata", players: ten, rng: mulberry32(5), avoid: [first.teamA, first.teamB] });
    const key = (l: string[]) => l.slice().sort().join("|");
    expect([key(second.teamA), key(second.teamB)]).not.toContain(key(first.teamA));
  });

  it("scambio manuale e ricalcolo della differenza", () => {
    const r = generateTeams({ mode: "bilanciata", players: ten, rng: mulberry32(1) });
    const swapped = swapPlayers(r.assignment, "p0", "p9");
    const again = evaluate(swapped, ten);
    expect(again.teamA.length).toBe(5);
    expect(again.strengthA + again.strengthB).toBeCloseTo(r.strengthA + r.strengthB, 5);
  });
});

// ---------------------------------------------------------------- statistiche
const players = [mk(1), mk(2), mk(3), mk(4)];
const m = (id: string, day: number, a: number, b: number, status: Match["status"] = "conclusa", mvp: string | null = null): Match => ({
  id, season_id: "s1", played_at: `2026-10-${String(day).padStart(2, "0")}T20:00:00Z`, location: "Iusu", duration_min: 60,
  status, score_a: a, score_b: b, mvp_player_id: mvp, notes: null,
});
const mp = (matchId: string, playerId: string, team: "A" | "B", gk = false): MatchPlayer => ({ id: `${matchId}${playerId}`, match_id: matchId, player_id: playerId, team, is_gk: gk });
const ev = (matchId: string, playerId: string, type: MatchEvent["type"], n: number): MatchEvent => ({ id: `${matchId}${playerId}${type}${n}`, match_id: matchId, player_id: playerId, type, minute: null });

const matches = [m("m1", 1, 2, 1, "conclusa", "p1"), m("m2", 8, 0, 0), m("m3", 15, 3, 0, "da_confermare"), m("m4", 22, 1, 4, "annullata")];
const mps = [
  ...["m1", "m2", "m3", "m4"].flatMap((id) => [mp(id, "p1", "A"), mp(id, "p2", "A", true), mp(id, "p3", "B"), mp(id, "p4", "B")]),
];
const evs = [ev("m1", "p1", "goal", 1), ev("m1", "p1", "goal", 2), ev("m1", "p3", "goal", 1), ev("m1", "p2", "assist", 1), ev("m3", "p1", "goal", 9)];

describe("statistiche", () => {
  const confirmed = confirmedMatches(matches);
  it("solo le partite 'conclusa' contano", () => {
    expect(confirmed.map((x) => x.id)).toEqual(["m1", "m2"]);
  });

  const stats = computeStats({ players, matchPlayers: mps, events: evs }, confirmed);
  it("conta presenze, V/N/P, gol, assist, MVP", () => {
    expect(stats.p1).toMatchObject({ played: 2, wins: 1, draws: 1, losses: 0, goals: 2, mvps: 1 });
    expect(stats.p2.assists).toBe(1);
    expect(stats.p3).toMatchObject({ played: 2, wins: 0, draws: 1, losses: 1, goals: 1 });
    expect(stats.p1.winPct).toBe(50);
  });
  it("ignora gol di partite non confermate", () => {
    expect(stats.p1.goals).toBe(2);
  });
  it("portiere: gol subiti e porta inviolata", () => {
    expect(stats.p2.gkMatches).toBe(2);
    expect(stats.p2.concededPerGame).toBe(0.5);
  });
  it("voto sempre tra 1 e 10", () => {
    for (const s of Object.values(stats)) for (const l of s.lines) expect(l.rating).toBeGreaterThanOrEqual(1), expect(l.rating).toBeLessThanOrEqual(10);
  });
  it("filtri per periodo", () => {
    expect(filterMatches(confirmed, { kind: "last", n: 1 }).map((x) => x.id)).toEqual(["m2"]);
    expect(filterMatches(confirmed, { kind: "season", seasonId: "s1" })).toHaveLength(2);
    expect(filterMatches(confirmed, { kind: "season", seasonId: "altra" })).toHaveLength(0);
    expect(filterMatches(confirmed, { kind: "month", month: "2026-10" })).toHaveLength(2);
  });
  it("classifiche: capocannoniere e assistman", () => {
    const r = buildRankings(players, stats, 1);
    expect(r.find((x) => x.key === "scorers")!.rows[0].playerId).toBe("p1");
    expect(r.find((x) => x.key === "assists")!.rows[0].playerId).toBe("p2");
    expect(r.find((x) => x.key === "keeper")!.rows[0].playerId).toBe("p2");
  });
  it("coppie: stessa squadra e contro", () => {
    const pairs = computePairs({ matchPlayers: mps }, confirmed);
    const rec = pairs.get("p1|p2")!;
    expect(rec.together).toMatchObject({ played: 2, wins: 1, draws: 1, losses: 0 });
    const vs = pairs.get("p1|p3")!;
    expect(vs.against).toMatchObject({ played: 2, aWins: 1, bWins: 0, draws: 1 });
  });
});

describe("impostazioni", () => {
  it("unisce i valori salvati ai default e ignora quelli non validi", () => {
    const s = mergeSettings([{ key: "algo", value: { min_matches: 5, variety: "x", sconosciuto: 1 } }]);
    expect(s.algo.min_matches).toBe(5);
    expect(s.algo.variety).toBe(DEFAULT_SETTINGS.algo.variety);
    expect(s.rating).toEqual(DEFAULT_SETTINGS.rating);
  });
});
