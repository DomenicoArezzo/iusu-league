import type { Player, PlayerRole, Skill } from "./types";

type Weights = Partial<Record<Skill, number>>;

/** Pesi per ruolo: sommano sempre a 1. */
export const ROLE_WEIGHTS: Record<PlayerRole, Weights> = {
  portiere: { saves: 0.45, defending: 0.1, physical: 0.1, passing: 0.1, vision: 0.1, technique: 0.1, pace: 0.05 },
  difensore: { defending: 0.3, physical: 0.2, pace: 0.1, passing: 0.12, vision: 0.1, technique: 0.08, dribbling: 0.05, shooting: 0.05 },
  centrocampista: { passing: 0.22, vision: 0.2, technique: 0.18, dribbling: 0.12, pace: 0.08, defending: 0.08, physical: 0.06, shooting: 0.06 },
  attaccante: { shooting: 0.28, dribbling: 0.18, pace: 0.16, technique: 0.14, physical: 0.08, vision: 0.08, passing: 0.06, defending: 0.02 },
  jolly: {
    shooting: 0.125, passing: 0.125, dribbling: 0.125, pace: 0.125,
    defending: 0.125, physical: 0.125, technique: 0.125, vision: 0.125,
  },
};

type Rated = Pick<Player, Skill | "preferred_role">;

/** Overall stile EA FC: valutazioni 1-10 → 10-99, pesate in base al ruolo preferito. */
export function computeOverall(p: Rated): number {
  const weights = ROLE_WEIGHTS[p.preferred_role] ?? ROLE_WEIGHTS.jolly;
  let sum = 0;
  let total = 0;
  for (const [skill, w] of Object.entries(weights) as [Skill, number][]) {
    sum += (p[skill] ?? 5) * w;
    total += w;
  }
  const avg = total > 0 ? sum / total : 5;
  return Math.max(10, Math.min(99, Math.round(avg * 10)));
}

/** Valore di partenza suggerito (crediti) a partire dall'overall. */
export function suggestedInitialValue(overall: number): number {
  return Math.max(5, Math.round(overall / 2));
}

/** I sei valori mostrati sulla carta giocatore (stile FUT). */
export function cardStats(p: Rated & Pick<Player, "saves">): { label: string; value: number }[] {
  const x10 = (n: number) => Math.round(n * 10);
  if (p.preferred_role === "portiere") {
    return [
      { label: "PAR", value: x10(p.saves) },
      { label: "DIF", value: x10(p.defending) },
      { label: "PAS", value: x10(p.passing) },
      { label: "RIT", value: x10(p.pace) },
      { label: "FIS", value: x10(p.physical) },
      { label: "VIS", value: x10(p.vision) },
    ];
  }
  return [
    { label: "RIT", value: x10(p.pace) },
    { label: "TIR", value: x10(p.shooting) },
    { label: "PAS", value: x10(p.passing) },
    { label: "DRI", value: x10(p.dribbling) },
    { label: "DIF", value: x10(p.defending) },
    { label: "FIS", value: x10(p.physical) },
  ];
}
